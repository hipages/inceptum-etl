import { promisifyAll } from 'bluebird';
import * as nodeAdwords from 'node-adwords';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { EtlSource } from '../EtlSource';
import { EtlConfig } from '../EtlConfig';
import { EtlBatch, EtlState } from '../EtlBatch';

promisifyAll(nodeAdwords);

export class AdwordsKeywords extends EtlSource {
  protected account: string;
  protected accountList: string;
  protected configAdwords: object;
  protected query = `SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId, Date,
  Device, Criteria , KeywordMatchType, Status, Impressions, Clicks ,Ctr, Cost, AverageCpc, AveragePosition, CpcBid,
  SearchImpressionShare, SearchRankLostImpressionShare, QualityScore, FirstPageCpc, TopOfPageCpc
  FROM   KEYWORDS_PERFORMANCE_REPORT
  WHERE  Clicks > 0 DURING `;

  constructor() {
    super();
    const configAdwords = EtlConfig.getConfig('sources.adwords');
    this.account = configAdwords.account;
    this.accountList = configAdwords.accountsList;
    this.configAdwords = {
        developerToken: configAdwords.token,
        userAgent: configAdwords.userAgent,
        clientCustomerId: configAdwords.clientCustomerId,
        client_id: configAdwords.clientId,
        client_secret: configAdwords.clientSecret,
        refresh_token: configAdwords.refreshToken,
        version: configAdwords.version,
    };
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
    const now = moment();
    const start = moment(this.initialSavePoint['endDate']);
    // tslint:disable-next-line
    const end = moment(this.initialSavePoint['endDate']).add(1, 'days');
    this.currentBatch = 0;
    this.totalBatches = this.accountList.length;
    this.currentSavePoint = {
      startDate: start.format('YYYYMMDD'),
      endDate: end.format('YYYYMMDD'),
      totalBatches: this.totalBatches,
      currentDate: now.toISOString(),
    };
  }

  /**
   * Get the next Save point
   */
  protected settNextSavePoint() {
    if (this.hasNextBatch) {
      if (this.currentBatch < this.totalBatches) {
        this.currentBatch++;
      } else {
        // tslint:disable-next-line
        const end = moment(this.currentSavePoint['endDate']).add(1, 'days');
        this.currentBatch = 1;
        this.currentSavePoint['startDate'] = this.currentSavePoint['endDate'],
        this.currentSavePoint['endDate'] = end.format('YYYYMMDD');
      }
    }
  }

  public async getNextBatch(): Promise<EtlBatch> {
    let data = [];
    if (this.hasNextBatch()) {
      this.settNextSavePoint();
      const config = {...this.configAdwords};
      const currentBatch = this.currentBatch - 1;
      const startDate = this.currentSavePoint['startDate'];
      config['clientCustomerId'] = this.accountList[currentBatch]['id'];
      const report = new nodeAdwords.AdwordsReport(config);
      const csv = await report.getReportAsync(config['version'], {
          query: `${this.query} ${startDate},${startDate}`,
          format: 'CSV',
          additionalHeaders: {
            skipReportHeader: true,
            skipReportSummary: true,
          },
      });
      // Replace spaces in the header row
      const header = csv.slice(0, csv.search(/[\n\r]+/i));
      const newHeader = header.replace(/ /g, '').replace(/\./g, '_');
      data = csvToObject(csv.replace(header, newHeader));
    }
    const batch =  new EtlBatch(data, this.currentBatch, this.totalBatches);
    return batch;
  }

  public hasNextBatch(): boolean {
    const finish = this.currentSavePoint['startDate'] >= this.currentSavePoint['endDate'];
    return (!finish && this.totalBatches > this.currentBatch);
  }

  public stateChanged(newState: EtlState) {
    if ((newState === EtlState.SAVE_ENDED) && (this.totalBatches === this.currentBatch)) {
      this.updateStoredSavePoint(this.currentSavePoint);
    }
  }
}
