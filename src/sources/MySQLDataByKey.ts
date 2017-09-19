import * as moment from 'moment';
import * as _ from 'lodash';
import { LogManager, DBClient, DBTransaction } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlSavepointManager } from '../EtlSavepointManager';

const log = LogManager.getLogger();

export class MySQLDataByKey extends EtlSource {
  protected mysqlClient: DBClient;
  protected etlConfig: object;
  // etl and table name
  protected tableName: string;
  protected searchColumn: string;
  protected pk: string;
  protected minId: number;
  protected maxId: number;

  constructor(mysqlClient: DBClient, etlConfig: object) {
    super();
    // Mysql object to perform ation of Mysql database
    this.mysqlClient = mysqlClient;
    // stl and table name
    this.tableName = etlConfig['tableName'].trim();
    this.searchColumn = etlConfig['searchColumn'].trim();
    this.pk = etlConfig['pk'] ? etlConfig['pk'].trim() : 0;
  }

  public getMysqlClient() {
    return this.mysqlClient;
  }

  public getTableName() {
    return this.tableName;
  }

  public getSearchColumn() {
    return this.searchColumn;
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
   * Convert a given string to savepoint object. If it is an emprystring
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
   * If the savepoint is empty we can't run the source
   */
  // tslint:disable-next-line:prefer-function-over-method
  public defaultSavePoint(): object {
    throw new Error(`Empty savepoint found to run source`);
  }

  /**
   * Get the stored save point using the etlSavepointManager
   * @param savepointManager
   */
  public async initSavePoint(etlSavepointManager: EtlSavepointManager): Promise<void> {
    this.etlSavepointManager = etlSavepointManager;
    this.initialSavePoint = await this.getStoredSavePoint();
    await this.initCurrentSavePoint();
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected async initCurrentSavePoint(): Promise<void> {
    // Validate the initial savepoint
    if (!this.initialSavePoint.hasOwnProperty('columnStartValue') || !this.initialSavePoint.hasOwnProperty('columnEndValue') || !this.initialSavePoint.hasOwnProperty('batchSize')) {
      throw new Error(`Missing fields in savepoint`);
    }
    this.currentSavePoint = {
      columnStartValue: this.initialSavePoint['columnStartValue'],
      columnEndValue: this.initialSavePoint['columnEndValue'],
      minId: this.initialSavePoint['minId'] || 0,
      maxId: this.initialSavePoint['maxId'] || 0,
      batchSize: Number(this.initialSavePoint['batchSize']),
      currentBatch: this.initialSavePoint.hasOwnProperty('currentBatch') ? Number(this.initialSavePoint['currentBatch']) : 0,
      totalBatches: 0,
      currentDate: moment().toISOString(),
    };
    const totalRecords = await this.getTotalRecords();
    this.totalBatches = (this.currentSavePoint['batchSize'] > 0) ? Math.ceil(totalRecords / this.currentSavePoint['batchSize']) : 0;
    this.currentSavePoint['totalBatches'] = this.totalBatches;
  }
  protected async getTotalRecords(): Promise<any> {
    const [minId, maxId] = await this.getMaxAndMinIds();
    const query = `SELECT  count(*) as total FROM ${this.tableName} where ${this.pk} between ? AND ? order by ${this.pk}`;
    try {
      const results = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => transaction.query(query, minId, maxId));
      if (results === null || results.length === 0 || !results[0].hasOwnProperty('total')) {
        return 0;
      }
      return Number(results[0]['total']);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  protected async getMaxAndMinIds(): Promise<Array<Number>> {
    const query = `SELECT  min(${this.pk}) as min_id, max(${this.pk}) as max_id FROM ${this.tableName} where ${this.searchColumn} between ? AND ? order by ${this.searchColumn}`;
    try {
      const results = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => transaction.query(query, this.currentSavePoint['columnStartValue'], this.currentSavePoint['columnEndValue']));
      this.minId = Number(_.first(results)['min_id']);
      this.maxId = Number(_.first(results)['max_id']);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Get the next Save point
   */
  protected getNextSavePoint(): object {
    const savePoint = {...this.currentSavePoint};
    savePoint['currentBatch'] = Number(savePoint['currentBatch']) + 1;
    savePoint['currentDate'] = moment().toISOString();
    return savePoint;
  }

  public hasNextBatch(): boolean {
    const nextSavePoint = this.getNextSavePoint();
    return (nextSavePoint['currentBatch'] <= nextSavePoint['totalBatches']);
  }

  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
      throw new Error(`Error found processing batch`);
    }
    if ((newState === EtlState.SAVE_ENDED)) {
      await this.updateStoredSavePoint(this.currentSavePoint);
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }

  protected async getRecords(): Promise<any> {
    const query = `SELECT  * FROM ${this.tableName} where ${this.pk} between ? AND ?`;
    try {
      const results = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => transaction.query(query, this.minId, this.maxId));
      return Promise.resolve(results);
    } catch (e) {
      return Promise.reject(e);
    }
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
      data = await this.getRecords();
      log.info(`read report from: ${this.currentSavePoint['currentBatch']} - ${this.currentSavePoint['totalBatches']} : batch ${this.currentSavePoint['currentBatch']}`);
    }
    const batch = new EtlBatch(
      data,
      this.currentSavePoint['currentBatch'],
      this.currentSavePoint['totalBatches'],
      `${this.currentSavePoint['currentBatch']}_${this.currentSavePoint['columnStartValue']}-${this.currentSavePoint['columnEndValue']}`,
    );
    batch.registerStateListener(this);
    return batch;
  }
}
