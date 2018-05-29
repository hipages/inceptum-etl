import * as moment from 'moment';
import * as lodash from 'lodash';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';
import { GoogleAnalytics } from '../util/GoogleAnalytics';

const log = LogManager.getLogger(__filename);

export class GoogleAnalyticsJobs extends EtlSource {
  protected MAX_RESULTS = 10000;
  protected injectedFields: Array<object>;
  protected gaClient: GoogleAnalytics;
  protected errorFound = false;
  // tslint:disable-next-line
  protected twoDaysAgo = moment().subtract(2, 'days');
  protected lastDay = moment();
  protected myDimensions: object;
  protected nextPageToken: Array<number>;
  protected dateRanges: object;
  protected rowCount: Array<number>;

  constructor(configGA: object) {
    super();
    // set proxy in the env var if it is configured
    if (configGA['proxy']) {
      process.env['HTTP_PROXY'] = configGA['proxy'];
      log.info(`proxy has configured ${process.env.HTTP_PROXY}`);
    }

    this.injectedFields = [{
      app_code: configGA['appCode'],
      source_name: configGA['sourceName'],
      source_account: configGA['sourceAccount'],
      source_time_zone: configGA['sourceTimeZone'],
      record_created_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
      proxy: configGA['proxy'],
    }];
    this.myDimensions = {
      key: 'ga:transactionId',
      keyStringPart: 'JOB',
      dimensions: [ {
        'ga:transactionId': 'transactionId',
        'ga:campaign': 'campaign',
        'ga:adGroup': 'adGroup',
        'ga:source': 'source',
        'ga:medium': 'medium',
        'ga:keyword': 'keyword',
        'ga:landingPagePath': 'landingPagePath',
        'ga:adMatchedQuery': 'adMatchedQuery',
        'ga:deviceCategory': 'deviceCategory',
      },
      {
        'ga:browser': 'browser',
        'ga:browserVersion': 'browserVersion',
        'ga:browserSize': 'browserSize',
      },
      {
        'ga:dimension15': 'dimension15',
      },
      {
        'ga:landingContentGroup5': 'landingContentGroup5',
      },
      ],
      metric: 'ga:transactions',
      filters: 'ga:transactionId=~^JOB*',
      orderBys: ['ga:transactionId'], // , 'ga:dateHourMinute'
    };
    this.nextPageToken = [];
    this.rowCount = [];
    this.myDimensions['dimensions'].forEach( (dimension) => {
      this.nextPageToken.push(1);
      this.rowCount.push(0);
    });
    // Default set to today
    this.dateRanges = {
      startDate: this.lastDay.format('YYYY-MM-DD'),
      endDate: this.lastDay.format('YYYY-MM-DD'),
    };
    // The client
    this.gaClient = new GoogleAnalytics({
        viewId: configGA['gaViewId'],
        client_email: configGA['clientEmail'],
        private_key: configGA['clientKey'],
    });
  }

  public getErrorFound(): boolean {
    return this.errorFound;
  }

  /**
   * Convert the savepoint object to a string for storage
   * @param savePoint
   */
  // tslint:disable-next-line:prefer-function-over-method
  protected savePointToString(savePoint: object) {
    return JSON.stringify(savePoint);
  }

  /**
   * Convert a given string to savepoint object. If it is an empry string
   * returns the default savepoint
   * @param savePoint
   */
  protected stringToSavePoint(savePoint: string) {
    if (savePoint.length === 0) {
      return this.defaultSavePoint();
    }
    return JSON.parse(savePoint);
  }

  /**
   * Get the default savepoint.
   */
  // tslint:disable-next-line:prefer-function-over-method
  public defaultSavePoint(): object {
    const now = moment();
    // tslint:disable-next-line
    const end = moment(this.twoDaysAgo.format('YYYY-MM-DD')).add(1, 'days')
    return {
      startDate: this.twoDaysAgo.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      currentDate: now.toISOString(),
    };
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected initCurrentSavePoint() {
    // tslint:disable-next-line
    let start = moment(this.initialSavePoint['endDate']).subtract(1, 'days');
    start = start.isBefore(this.twoDaysAgo) ? start : this.twoDaysAgo;
    // tslint:disable-next-line
    const end = moment(start.format('YYYY-MM-DD')).add(1, 'days');
    this.currentSavePoint = {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.isBefore(this.lastDay) ? end.format('YYYY-MM-DD') : this.lastDay.format('YYYY-MM-DD'),
      currentBatch: 0, // Needs to start with 0 to run the first time
      totalBatches: 1,
      currentDate: moment().toISOString(),
    };
    // We are processing one day at the time
    this.dateRanges = {
          startDate: this.currentSavePoint['startDate'],
          endDate: this.currentSavePoint['startDate'],
    };
  }

  /**
   * Get the next Save point
   */
  protected getNextSavePoint(): object {
    const savePoint = {...this.currentSavePoint};
    // If the current batch is 0 we need to call the API
    if (savePoint['currentBatch'] < savePoint['totalBatches']) {
      savePoint['currentBatch']++;
    } else {
      const start = moment(savePoint['startDate']).add(1, 'days');
      // tslint:disable-next-line
      const end = moment(savePoint['endDate']).add(1, 'days');
      savePoint['currentBatch'] = 1;
      savePoint['startDate'] = start.format('YYYY-MM-DD'),
      savePoint['endDate'] = end.isBefore(this.lastDay) ? end.format('YYYY-MM-DD') : this.lastDay.format('YYYY-MM-DD');
      // Reset next page token
      this.nextPageToken.forEach((pageToken, index) => {
        this.nextPageToken[index] = 1;
      });
    }
    return savePoint;
  }

  protected static constructDimensions(arr: Array<object>, itemKey: string): string[][] {
      const groups = [];
      arr.forEach( (item) => {
        const dimensions = Object.keys(item);
        if (dimensions.indexOf(itemKey) < 0) {
          dimensions.push(itemKey);
        }
        groups.push(dimensions);
      } );
      return groups;
  }

  /**
   * setup the nextPageToken if returned back in response
   */
  protected setNextPageToken(result: Array<any>, LastKey: string) {
    // Get the number of rows for all results
    this.setRowCount(result);

    // Get the next page to read
    result.forEach( (item, index) => {
      let nextPageToken = (item.reports && item.reports.length > 0 && this.gaClient.getObject(item.reports, 'nextPageToken'))
                          ? this.gaClient.getObject(item.reports, 'nextPageToken')
                          : false;
      /**
       * We need to reset the page pointer of all the other calls to
       * match the last transaction id of the result[0]
       *
       * Warning: atm Google API has a bug and sometimes returns a wrong number of rows in the other calls
       */
      if ((index > 0) && (this.rowCount[index] > this.MAX_RESULTS)) {
        const rowIndex = this.gaClient.findDimensionKeyRowIndex(item, this.myDimensions['key'], LastKey, this.myDimensions
        ['keyStringPart'].length);
        if (rowIndex !== false) {
          if (nextPageToken) {
            nextPageToken = (rowIndex === -1) ? nextPageToken : this.nextPageToken[index] + Number(rowIndex);
          } else {
            nextPageToken = (this.rowCount[index] <= this.MAX_RESULTS) ? 1 : ((rowIndex === -1) ? this.rowCount[index] : this.nextPageToken[index] + Number(rowIndex));
          }
        }
      }
      this.nextPageToken[index] = nextPageToken ? Number(nextPageToken) : this.nextPageToken[index];
    });
  }

  /**
   * setup the rowCount if returned back in response
   */
  protected setRowCount(result: Array<any>) {
    result.forEach( (item, index) => {
      this.rowCount[index] = (item.reports && item.reports.length > 0 && this.gaClient.getObject(item.reports, 'rowCount'))
      ? Number(this.gaClient.getObject(item.reports, 'rowCount'))
      : 0;
    });
  }

  /**
   * setup the nextPageToken if returned back in response
   */
  protected getLastKey(result, key) {
    // remove ga: from the key
    key = key.substring(3);
    const items = (result && result[0].reports && result[0].reports.length > 0 && this.gaClient.getObject(result[0].reports, 'rows'))
    ? this.gaClient.mergeHeadersDimensions(result[0].reports)
    : [];
    const lastItem = items.length - 1;
    return (lastItem >= 0) ? items[lastItem][key] || '' : '';
  }

  /**
   * Fetch all the dimensions from GA and get the array of results
   */
  protected async fetchResultsFromGA() {
    const self = this;
    const dimensionToProcess: string[][] = GoogleAnalyticsJobs.constructDimensions(self.myDimensions['dimensions'], self.myDimensions['key']);
    // Get the firs block and find the first and last key for the following calls
    const allPromises = dimensionToProcess.map(
      (dimension: any, index) => {
        return self.gaClient.fetch({
            dimensions: dimension,
            metrics: self.myDimensions['metric'],
            dateRanges: self.dateRanges,
            filters: self.myDimensions['filters'],
            orderBys: self.myDimensions['key'],
            includeEmptyRows: true,
            maxResults: self.MAX_RESULTS,
            nextPageToken: self.nextPageToken[index],
          },
        );
      },
    );
    const result = await Promise.all(allPromises);
    // setup the next page token if returned back in response
    const lastKeys = self.getLastKey(result, self.myDimensions['key']);
    self.setNextPageToken(result, lastKeys);

    // setting created date to be injected in each record
    self.injectedFields[0]['record_created_date'] = moment.utc().format('YYYY-MM-DD HH:mm:ss');
    return self.gaClient.mergeDimensionsRows(result, self.injectedFields);
  }

  /**
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  public async getNextBatch(): Promise<EtlBatch> {
    let data = [];
    if (this.hasNextBatch()) {
      this.currentSavePoint = this.getNextSavePoint();
      // We are processing one day at the time to avoid exceed 10.000 records
      this.dateRanges = {
        startDate: this.currentSavePoint['startDate'],
        endDate: this.currentSavePoint['startDate'],
      };
      data = await this.fetchResultsFromGA();
      // If it is the first batch store total batches
      if (this.currentSavePoint['currentBatch'] === 1) {
        const totalBatches = Math.ceil(Number(this.rowCount[0]) / this.MAX_RESULTS);
        this.currentSavePoint['totalBatches'] = totalBatches;
      }
      log.debug(`read GA report from: ${this.currentSavePoint['startDate']} - ${this.currentSavePoint['endDate']} : batch ${this.currentSavePoint['currentBatch']}`);
    }
    const batch = new EtlBatch(
      data,
      this.currentSavePoint['currentBatch'],
      this.currentSavePoint['totalBatches'],
      `${this.dateRanges['startDate']}.${this.dateRanges['endDate']}.${this.currentSavePoint['currentBatch']}`,
    );
    batch.registerStateListener(this);
    return batch;
  }

  public hasNextBatch(): boolean {
    const nextSavePoint = this.getNextSavePoint();
    const finish = nextSavePoint['startDate'] > nextSavePoint['endDate'];
    return (!finish);
  }

  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
      this.errorFound = true;
    }
    if (!this.errorFound && (newState === EtlState.SAVE_ENDED) && (this.currentSavePoint['currentBatch'] === this.currentSavePoint['totalBatches'])) {
      await this.updateStoredSavePoint(this.currentSavePoint);
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }
}
