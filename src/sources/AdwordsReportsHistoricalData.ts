import { promisifyAll } from 'bluebird';
import * as nodeAdwords from 'node-adwords';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import AdwordsReportExtend from '../util/AdwordsReportExtend';
import { AdwordsReports } from './AdwordsReports';

promisifyAll(nodeAdwords);
const log = LogManager.getLogger(__filename);

export class AdwordsReportsHistoricalData extends AdwordsReports {
  protected lastDay = moment().format('YYYYMMDD');

  constructor(configAdwords: object) {
    super(configAdwords);
  }

  /**
   * Get the default savepoint.
   */
  // tslint:disable-next-line:prefer-function-over-method
  public defaultSavePoint(): object {
    const now = moment();
    const paceAmount = 1;
    const paceTime = 'days';
    // tslint:disable-next-line
    const yesterday = moment().subtract(paceAmount, paceTime);
    const finalDate = yesterday.format('YYYYMMDD');
    return {
      paceAmount,
      paceTime,
      finalDate,
      startDate: yesterday.format('YYYYMMDD'),
      endDate: now.format('YYYYMMDD'),
      currentDate: now.toISOString(),
    };
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected initCurrentSavePoint() {
    // The etl runs backwards on time
    const paceAmount = this.initialSavePoint['paceAmount'] || 1;
    const paceTime = this.initialSavePoint['paceTime'] || 'days';
    const finalDate = this.initialSavePoint['finalDate'] || this.initialSavePoint['startDate'];
    // tslint:disable-next-line
    const start = moment(this.initialSavePoint['startDate']).subtract(paceAmount, paceTime);
    // tslint:disable-next-line
    const end = moment(this.initialSavePoint['startDate']).subtract(1, 'days');
    this.currentSavePoint = {
      paceAmount,
      paceTime,
      finalDate,
      startDate: start.isBefore(moment(finalDate)) ? finalDate : start.format('YYYYMMDD'),
      endDate: end.format('YYYYMMDD'),
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
      const start = moment(savePoint['startDate']).subtract(savePoint['paceAmount'], savePoint['paceTime']);
      // tslint:disable-next-line
      const end = moment(savePoint['startDate']).subtract(1, 'days');
      savePoint['currentBatch'] = 1;
      savePoint['startDate'] = start.isBefore(moment(savePoint['finalDate'])) ? savePoint['finalDate'] : start.format('YYYYMMDD');
      savePoint['endDate'] = end.format('YYYYMMDD');
    }
    return savePoint;
  }

  public getCurrentBatchIdentifier(): string {
    return `${this.currentSavePoint['startDate']}.${this.currentSavePoint['endDate']}`;
  }

  protected async getAdwordsReport(config: object) {
    const currentBatch = this.currentSavePoint['currentBatch'] - 1;
    config['clientCustomerId'] = this.accountList[currentBatch]['id'];
    const report = (config['proxy']) ? new AdwordsReportExtend(config) : new nodeAdwords.AdwordsReport(config);
    return await report.getReportAsync(config['version'], {
        query: `${this.query} DURING ${this.currentSavePoint['startDate']},${this.currentSavePoint['endDate']}`,
        format: 'CSV',
        additionalHeaders: {
          skipReportHeader: true,
          skipReportSummary: true,
        },
    });
  }

  public hasNextBatch(): boolean {
    const nextSavePoint = this.getNextSavePoint();
    const finish = nextSavePoint['startDate'] > nextSavePoint['endDate'];
    return (!finish);
  }

}
