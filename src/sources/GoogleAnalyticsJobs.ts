import * as moment from 'moment';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';
import { GoogleAnalytics } from '../util/GoogleAnalytics';

const log = LogManager.getLogger();

export class GoogleAnalyticsJobs extends EtlSource {
  protected MAX_RESULTS = 10000;
  protected injectedFields: Array<object>;
  protected gaClient: GoogleAnalytics;
  protected errorFound = false;
  // tslint:disable-next-line
  protected twoDaysAgo = moment().subtract(2, 'days');
  protected lastDay = moment();
  protected myDimensions: object;
  protected nextPageToken: number;
  protected dateRanges: object;
  protected rowCount: number;

  constructor(configGA: object) {
    super();
    this.injectedFields = [{
      app_code: configGA['appCode'],
      source_name: configGA['sourceName'],
      source_account: configGA['sourceAccount'],
      source_time_zone: configGA['sourceTimeZone'],
      record_created_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
    }];
    this.nextPageToken = 1;
    this.rowCount = 0;
    this.myDimensions = {
      'ga:transactionId': 'transactionId',
      'ga:campaign': 'campaign',
      'ga:adGroup': 'adGroup',
      'ga:source': 'source',
      'ga:medium': 'medium',
      'ga:keyword': 'keyword',
      'ga:landingPagePath': 'landingPagePath',
      'ga:adMatchedQuery': 'adMatchedQuery',
      'ga:deviceCategory': 'deviceCategory',
      'ga:browser': 'browser',
      'ga:browserVersion': 'browserVersion',
      'ga:browserSize': 'browserSize',
      // 'ga:dimension15': 'dimension15',
    };
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
    return {
      startDate: this.twoDaysAgo.format('YYYY-MM-DD'),
      endDate: this.lastDay.format('YYYY-MM-DD'),
      currentDate: now.toISOString(),
    };
  }

  /**
   * This method can be overriten to set the required data to fetch the next batch
   */
  protected initCurrentSavePoint() {
    // tslint:disable-next-line
    const end = moment(this.initialSavePoint['endDate']).subtract(1, 'days');
    this.currentSavePoint = {
      startDate: end.isBefore(this.twoDaysAgo) ? end.format('YYYY-MM-DD') : this.twoDaysAgo.format('YYYY-MM-DD'),
      endDate: this.lastDay.format('YYYY-MM-DD'),
      currentBatch: 0, // Needs to start with 0 to run the first time
      totalBatches: 1,
      currentDate: moment().toISOString(),
    };
    this.dateRanges = {
          startDate: this.currentSavePoint['startDate'],
          endDate: this.currentSavePoint['endDate'],
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
      const start = moment(savePoint['endDate']);
      // tslint:disable-next-line
      const end = moment(savePoint['endDate']).add(1, 'days');
      savePoint['currentBatch'] = 1;
      savePoint['startDate'] = start.format('YYYY-MM-DD'),
      savePoint['endDate'] = end.isBefore(this.lastDay) ? end.format('YYYY-MM-DD') : this.lastDay.format('YYYY-MM-DD');
    }
    return savePoint;
  }

  private static constructDimentions(arr: string[], chunkSize: number): string[][] {
      const groups = [];
      for (let i = 0; i < arr.length; i += chunkSize) {
          groups.push(arr.slice(i, i + chunkSize));
      }
      return groups;
  }

  /**
   * setup the nextPageToken if returned back in response
   */
  private setNextPageToken(result) {
    this.nextPageToken = (result && result[0].reports && result[0].reports.length > 0 && this.gaClient.getObject(result[0].reports, 'nextPageToken'))
    ? Number(this.gaClient.getObject(result[0].reports, 'nextPageToken'))
    : this.nextPageToken;
  }

  /**
   * setup the rowCount if returned back in response
   */
  private setRowCount(result) {
    this.rowCount = (result && result[0].reports && result[0].reports.length > 0 && this.gaClient.getObject(result[0].reports, 'rowCount'))
    ? Number(this.gaClient.getObject(result[0].reports, 'rowCount'))
    : this.nextPageToken;
  }

  /**
   * Fetch all the dimensions from GA and get the arry of results
   */
  private async fetchResultsFromGA() {
    const self = this;
    const dimensionToProcess: string[][] = GoogleAnalyticsJobs.constructDimentions(Object.keys(self.myDimensions), 9);
    // TODO: FIXEME: Hack to add dimension15 as seperate array.
    dimensionToProcess.push(['ga:dimension15']);
    const allPromises = dimensionToProcess.map(
      (dimension: any) => {
        if (dimension.includes('ga:transactionId') === false) {
          dimension.push('ga:transactionId');
        }
        return self.gaClient.fetch({
            dimensions: dimension,
            metrics: 'ga:transactions',
            dateRanges: self.dateRanges,
            filters: 'ga:transactionId=~^JOB*',
            orderBys: 'ga:transactionId',
            includeEmptyRows: true,
            maxResults: self.MAX_RESULTS,
            nextPageToken: self.nextPageToken,
          },
        );
      },
    );
    const result = await Promise.all(allPromises);
    // setup the next page token if returned back in response
    self.setNextPageToken(result);
    self.setRowCount(result);

    // setting created date to be injected in each record
    self.injectedFields[0]['record_created_date'] = moment.utc().format('YYYY-MM-DD HH:mm:ss');
    // push injected fields to the result set
    // result.push(self.injectedFields);
    // data = self.gaClient.mergeDimensionsRows.apply(self.gaClient, result);
    return self.gaClient.mergeDimensionsRows1(result, self.injectedFields);
  }

  /**
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  public async getNextBatch(): Promise<EtlBatch> {
    const self = this;
    let data = [];
    if (self.hasNextBatch()) {
      self.currentSavePoint = self.getNextSavePoint();
      self.dateRanges = {
        startDate: self.currentSavePoint['startDate'],
        endDate: self.currentSavePoint['endDate'],
      };
      data = await self.fetchResultsFromGA();
      // If it is the first batch store total batches
      if (self.currentSavePoint['currentBatch'] === 1) {
        const totalBatches = Math.ceil(Number(self.rowCount) / self.MAX_RESULTS);
        self.currentSavePoint['totalBatches'] = totalBatches;
      }
      log.debug(`read GA report from: ${self.currentSavePoint['startDate']} - ${self.currentSavePoint['endDate']} : batch ${self.currentSavePoint['currentBatch']}`);
    }
    const batch = new EtlBatch(
      data,
      self.currentSavePoint['currentBatch'],
      self.currentSavePoint['totalBatches'],
      `${self.currentSavePoint['startDate']}:${self.currentSavePoint['endDate']}:${self.currentSavePoint['currentBatch']}`,
    );
    batch.registerStateListener(this);
    return batch;
  }

  public hasNextBatch(): boolean {
    const nextSavePoint = this.getNextSavePoint();
    const finish = nextSavePoint['startDate'] >= nextSavePoint['endDate'];
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
