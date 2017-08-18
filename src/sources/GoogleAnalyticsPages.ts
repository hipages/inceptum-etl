import * as moment from 'moment';
import * as lodash from 'lodash';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';
import { GoogleAnalytics } from '../util/GoogleAnalytics';

const log = LogManager.getLogger();

export class GoogleAnalyticsPages extends EtlSource {
  protected MAX_RESULTS = 10000;
  protected injectedFields: Array<object>;
  protected gaClient: GoogleAnalytics;
  protected errorFound = false;
  // tslint:disable-next-line
  protected yesterday = moment().subtract(1, 'days');
  protected today = moment();
  protected gaParams: object;

  constructor(configGA: object) {
    super();
    this.injectedFields = [{
      app_code: configGA['appCode'],
      source_name: configGA['sourceName'],
      source_account: configGA['sourceAccount'],
      source_time_zone: configGA['sourceTimeZone'],
      record_created_date: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
    }];
    this.gaParams = {
        dimensions: 'ga:medium,ga:source,ga:landingPagePath,ga:deviceCategory,ga:region,ga:campaign,ga:adGroup,ga:landingContentGroup5',
        metrics: 'ga:sessions,ga:percentNewSessions,ga:organicSearches,ga:goal1Completions,ga:goal15Completions,ga:pageviews',
        dateRanges: {
          startDate: this.yesterday.format('YYYY-MM-DD'),
          endDate: this.yesterday.format('YYYY-MM-DD'),
        },
        filters: '',
        orderBys: '',
        includeEmptyRows: true,
        maxResults: this.MAX_RESULTS,
        nextPageToken: 1,
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
      startDate: this.yesterday.format('YYYY-MM-DD'),
      endDate: this.today.format('YYYY-MM-DD'),
      currentDate: now.toISOString(),
    };
  }

  /**
   * This method can be overriten to set the required data to fetch the next batch
   */
  protected initCurrentSavePoint() {
    const start = moment(this.initialSavePoint['endDate']);
    // tslint:disable-next-line
    const end = moment(this.initialSavePoint['endDate']).add(1, 'days');
    this.currentSavePoint = {
      startDate: start.isBefore(this.yesterday) ? start.format('YYYY-MM-DD') : this.yesterday.format('YYYY-MM-DD'),
      endDate: end.isBefore(this.today) ? end.format('YYYY-MM-DD') : this.today.format('YYYY-MM-DD'),
      currentBatch: 0, // Needs to start with 0 to run the first time
      totalBatches: 1,
      currentDate: moment().toISOString(),
    };
    const dateRanges = {
          startDate: this.currentSavePoint['startDate'],
          endDate: this.currentSavePoint['startDate'],
    };
    this.gaParams['dateRanges'] = dateRanges;
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
      savePoint['endDate'] = end.isBefore(this.today) ? end.format('YYYY-MM-DD') : this.today.format('YYYY-MM-DD');
    }
    return savePoint;
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
      const currentBatch = this.currentSavePoint['currentBatch'];
      const startDate = this.currentSavePoint['startDate'];
      this.gaParams['dateRanges']['startDate'] = startDate;
      this.gaParams['dateRanges']['endDate'] = startDate;

      // Get the data from GA
      let results = await this.gaClient.fetch(this.gaParams);
      this.gaParams['nextPageToken'] = this.gaClient.getNextPageToken();

      if (results) {
        results = results.reports[0];
        // If it is the first batch store total batches
        if (this.currentSavePoint['currentBatch'] === 1) {
          const totalBatches = Math.ceil(Number(this.gaClient.getObject(results, 'rowCount')) / this.MAX_RESULTS);
          this.currentSavePoint['totalBatches'] = totalBatches;
        }
        this.injectedFields[0]['record_created_date'] = moment.utc().format('YYYY-MM-DD HH:mm:ss');
        this.injectedFields[0]['report_date'] = startDate;
        data = this.gaClient.mergeDimMetricsRows(results, this.injectedFields);
        log.debug(`read GA report from: ${startDate} - ${currentBatch}`);
      }
    }
    const batch =  new EtlBatch(data, this.currentSavePoint['currentBatch'], this.currentSavePoint['totalBatches'], `${this.currentSavePoint['startDate']}:${this.currentSavePoint['currentBatch']}`);
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
