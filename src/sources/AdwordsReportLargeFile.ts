import { promisifyAll } from 'bluebird';
import * as nodeAdwords from 'node-adwords';
import * as moment from 'moment';
import * as fs from 'fs';
import { join as joinPath } from 'path';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { ReadCsvFile } from './ReadCsvFile';

promisifyAll(nodeAdwords);
const log = LogManager.getLogger();

export interface AdwordsReportLargeFileConfig {
  tempDirectory: string,
  reportQuery: string,
  account: string,
  token: string,
  userAgent: string,
  clientCustomerId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  version: string,
}

export class AdwordsReportLargeFile extends ReadCsvFile {
  // Example of queries
  protected clicksQuery = `SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId, CriteriaParameters, CriteriaId, KeywordMatchType, AdFormat, CreativeId, Device, Date, GclId, Clicks, ClickType, ExternalCustomerId, Page, Slot FROM CLICK_PERFORMANCE_REPORT`;

  protected account: string;
  protected query: string;
  protected configAdwords: object;
  protected lastDay = moment().format('YYYYMMDD');
  protected errorFound = false;

  constructor(configAdwords: AdwordsReportLargeFileConfig) {
    super({
      fileName: joinPath(configAdwords.tempDirectory, configAdwords.clientCustomerId.replace(/ /g, '')),
      fileHasHeader: true,
    });
    const directory = configAdwords.tempDirectory;
    if (!fs.existsSync(directory)) {
        log.info(`Saving batch directory does not exist:${directory}. Will create`);
        fs.mkdirSync(directory);
    }

    this.query = configAdwords.reportQuery;
    this.account = configAdwords.account;
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

  public getAccount(): string {
    return this.account;
  }

  public getQuery(): string {
    return this.query;
  }

  public getConfigAdwords(): object {
    return this.configAdwords;
  }

  /**
   * Get the default savepoint.
   */
  // tslint:disable-next-line:prefer-function-over-method
  public defaultSavePoint(): object {
    const savepoint = super.defaultSavePoint();
    // tslint:disable-next-line
    const yesterday = moment().subtract(1, 'days');
    return {
      ...savepoint,
      startDate: yesterday.format('YYYYMMDD'),
      endDate: this.lastDay,
      currentDate: moment().toISOString(),
    };
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected async initCurrentSavePoint() {
    // tslint:disable-next-line
    const start = moment(this.initialSavePoint['endDate']).add(1, 'days');
    const currentSavePoint = {
      startDate: start.isBefore(this.lastDay) ? start.format('YYYYMMDD') : this.lastDay,
      endDate: this.lastDay,
      currentDate: moment().toISOString(),
    };
    await this.getAdwordsReport(currentSavePoint);
    await super.initCurrentSavePoint();
    this.currentSavePoint = {
      ...this.currentSavePoint,
      ...currentSavePoint,
    };
  }

  protected async getAdwordsReport(savePoint: object) {
    const report = new nodeAdwords.AdwordsReport(this.configAdwords);
    const csv = await report.getReportAsync(this.configAdwords['version'], {
        query: `${this.query} DURING ${savePoint['startDate']},${savePoint['endDate']}`,
        format: 'CSV',
        additionalHeaders: {
          skipReportHeader: true,
          skipReportSummary: true,
        },
    });
    const header = csv.slice(0, csv.search(/[\n\r]+/i));
    const newHeader = header.toLowerCase().replace(/ /g, '_').replace(/[\.|\/|\(|\)|-]+/g, '')
    .replace(/day/i, 'report_date').replace(/cost/i, 'report_cost');
    fs.writeFileSync(this.fileName, csv.replace(header, newHeader));
  }

}
