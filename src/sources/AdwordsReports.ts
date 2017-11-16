import { promisifyAll } from 'bluebird';
import * as nodeAdwords from 'node-adwords';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';

promisifyAll(nodeAdwords);
const log = LogManager.getLogger();

export class AdwordsReports extends EtlSource {
  // Example of queries
  protected keywordsQuery = `SELECT AccountDescriptiveName, AccountTimeZone, CampaignName, CampaignId, AdGroupName, AdGroupId, Criteria, Id, KeywordMatchType, Status, Date, Device, Impressions, Clicks, Conversions, Cost, Ctr, AverageCpc, ConversionRate, CpcBid,  CpcBidSource, QualityScore, HasQualityScore, CreativeQualityScore, CriteriaDestinationUrl, AveragePosition, FirstPageCpc, FirstPositionCpc, TopOfPageCpc, IsNegative, SearchExactMatchImpressionShare, SearchImpressionShare, SearchRankLostImpressionShare, BidType FROM KEYWORDS_PERFORMANCE_REPORT WHERE  Clicks > 0 `;
  protected clicksQuery = `SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId, CriteriaParameters, CriteriaId, KeywordMatchType, AdFormat, CreativeId, Device, Date, GclId, Clicks, ClickType, ExternalCustomerId, Page, Slot FROM CLICK_PERFORMANCE_REPORT`;

  protected account: string;
  protected accountList: string;
  protected query: string;
  protected configAdwords: object;
  protected lastDay = moment().format('YYYYMMDD');
  protected errorFound = false;

  constructor(configAdwords: object) {
    super();
    this.query = configAdwords['reportQuery'];
    this.account = configAdwords['account'];
    this.accountList = configAdwords['accountsList'];
    this.totalBatches = this.accountList.length;
    this.configAdwords = {
        developerToken: configAdwords['token'],
        userAgent: configAdwords['userAgent'],
        clientCustomerId: configAdwords['clientCustomerId'],
        client_id: configAdwords['clientId'],
        client_secret: configAdwords['clientSecret'],
        refresh_token: configAdwords['refreshToken'],
        version: configAdwords['version'],
    };
  }

  public getErrorFound(): boolean {
    return this.errorFound;
  }

  public getAccount(): string {
    return this.account;
  }

  public getAccountList(): string {
    return this.accountList;
  }

  public getQuery(): string {
    return this.query;
  }

  public getConfigAdwords(): object {
    return this.configAdwords;
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
    const yesterday = moment().subtract(1, 'days');
    return {
      startDate: yesterday.format('YYYYMMDD'),
      endDate: now.format('YYYYMMDD'),
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
      startDate: start.format('YYYYMMDD'),
      endDate: end.isBefore(this.lastDay) ? end.format('YYYYMMDD') : this.lastDay,
      currentBatch: 0, // Needs to start with 0 to run the first time
      totalBatches: this.totalBatches,
      currentDate: moment().toISOString(),
    };
  }

  /**
   * Get the next Save point
   */
  protected getNextSavePoint(): object {
    const savePoint = {...this.currentSavePoint};
    if (savePoint['currentBatch'] < this.totalBatches) {
      savePoint['currentBatch']++;
    } else {
      // tslint:disable-next-line
      const end = moment(savePoint['endDate']).add(1, 'days');
      savePoint['currentBatch'] = 1;
      savePoint['startDate'] = savePoint['endDate'];
      savePoint['endDate'] = end.isBefore(this.lastDay) ? end.format('YYYYMMDD') : this.lastDay;
    }
    return savePoint;
  }

  public getCurrentBatchIdentifier(): string {
    return this.currentSavePoint['startDate'];
  }

  protected async getAdwordsReport(config: object) {
    const currentBatch = this.currentSavePoint['currentBatch'] - 1;
    config['clientCustomerId'] = this.accountList[currentBatch]['id'];
    const report = new nodeAdwords.AdwordsReport(config);
    return await report.getReportAsync(config['version'], {
        query: `${this.query} DURING ${this.currentSavePoint['startDate']},${this.currentSavePoint['startDate']}`,
        format: 'CSV',
        additionalHeaders: {
          skipReportHeader: true,
          skipReportSummary: true,
        },
    });
  }

  /**
   * Convert csv to data object
   * @param {string} csv
   */
  protected async getReportData(): Promise<any> {
    const config = {...this.configAdwords};
    const csv = await this.getAdwordsReport(config);
    // Replace spaces in the header row
    const header = csv.slice(0, csv.search(/[\n\r]+/i));
    const newHeader = header.toLowerCase().replace(/ /g, '_').replace(/[\.|\/|\(|\)|-]+/g, '')
    .replace(/day/i, 'report_date').replace(/cost/i, 'report_cost');
    return csvToObject(csv.replace(header, newHeader).replace(/--/g, '').replace(/%/g, ''), { delimiter : ',', quote: '"' });
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
      data = await this.getReportData();
      log.debug(`read adwords report for: ${this.getCurrentBatchIdentifier()}`);
    }
    const batch =  new EtlBatch(data, this.currentSavePoint['currentBatch'], this.totalBatches, this.getCurrentBatchIdentifier());
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
    if (!this.errorFound && (newState === EtlState.SAVE_ENDED) && (this.currentSavePoint['currentBatch'] === this.totalBatches)) {
      await this.updateStoredSavePoint(this.currentSavePoint);
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }
}
