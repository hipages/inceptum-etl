import * as moment from 'moment';

import * as fs from 'fs';
import { join as joinPath } from 'path';
import { toObject as csvToObject } from 'csvjson';

import { LogManager, DBClient, DBTransaction } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';

const log = LogManager.getLogger();

export class GaLandingPagesHistoricaldata extends EtlSource {
  protected errorFound = false;
  protected row;

  protected mysqlClient: DBClient;
  protected etlConfig: object;
  // etl and table name
  protected etlName: string;
  protected tableName: string;
  protected searchColoumn: string;
  // bactch details
  protected currentBatch: number;
  protected endBatch: number;
  protected totalBatches: number;
  protected newCurrentBatch: number;


  constructor(mysqlClient: DBClient, etlConfig: object) {
    super();
    // Mysql object to perform ation of Mysql database
    this.mysqlClient = mysqlClient;
    // stl and table name
    this.etlName = etlConfig['etlName'].trim();
    this.tableName = etlConfig['tableName'].trim();
    this.searchColoumn = etlConfig['searchColoumn'].trim();
    this.currentBatch = etlConfig['currentBatch'];
    this.endBatch = Number(etlConfig['endBatch']) || 0;
    this.totalBatches = etlConfig['totalBatches'] || 10000;
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
      currentDate: now.toISOString(),
    };
  }

  /**
   * This method can be overriten to set the required data to fetch the next batch
   */
  protected initCurrentSavePoint() {
    // tslint:disable-next-line
    this.currentSavePoint = {
      currentBatch: this.initialSavePoint['currentBatch'],       // 48172196 | Needs to start with last id order by desc to run the first time
      totalBatches: this.initialSavePoint['totalBatches'],
      currentDate: moment().toISOString(),
    };
  }

  public hasNextBatch(): boolean {
    const nextSavePoint = this.getNextSavePoint();
    return (nextSavePoint['currentBatch'] >= this.endBatch);
  }

  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
     this.errorFound = true;
    }
    // Note: Still have doubts here. Need Clarification
    if (!this.errorFound && (newState === EtlState.SAVE_ENDED) && (this.currentSavePoint['currentBatch'] === this.currentSavePoint['totalBatches'])) {
      await this.updateStoredSavePoint(this.currentSavePoint);
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }

  protected async getRecords(): Promise<any> {
    // return Promise.resolve(csvToObject(fs.readFileSync(joinPath(__dirname, '../../landing_page_path.csv'), { encoding : 'utf8'}), { delimiter : ',', quote: '"' }));
    const query = `SELECT  * FROM ${this.tableName} where ${this.searchColoumn} between ${this.newCurrentBatch} AND ${this.currentBatch} limit ${this.totalBatches}`;
    try {
      const results = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => transaction.query(query));
      if ((results !== null && results.length > 0)) {
        return Promise.resolve(results);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * Get the next Save point
   */
  protected getNextSavePoint(): object {
    const savePoint = {...this.currentSavePoint};
    // new save point will be current save point against while we already ran the query minus the total bactch size
    savePoint['currentBatch'] = savePoint['currentBatch'] - savePoint['totalBatches'];
    savePoint['currentDate'] = moment().toISOString();
    return savePoint;
  }

  /**
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  public async getNextBatch(): Promise<EtlBatch> {
    const self = this;
    let data;
    if (self.hasNextBatch()) {
      // lets calculate the limit of ID we are going to call. we are going backward so current ID - total batch is out starting point
      this.newCurrentBatch = this.currentSavePoint['currentBatch'] - this.currentSavePoint['totalBatches'];
      this.currentBatch = this.currentSavePoint['currentBatch'];
      this.totalBatches = this.currentSavePoint['totalBatches'];
      data = await self.getRecords();
      this.currentSavePoint = self.getNextSavePoint();
      log.info(`read report from: ${self.currentSavePoint['currentBatch']} - ${self.currentSavePoint['totalBatches']} : batch ${self.currentSavePoint['currentBatch']}`);
    }
    if (data) {
      const batch = new EtlBatch(
        data,
        self.currentSavePoint['currentBatch'],
        self.currentSavePoint['totalBatches'],
        `${this.currentBatch}:${this.newCurrentBatch}:${this.totalBatches}:${self.currentSavePoint['currentDate']}`,
      );
      batch.registerStateListener(this);
      return batch;
    }
  }
}
