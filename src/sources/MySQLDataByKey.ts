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
  protected searchColumnDataType: string;

  constructor(mysqlClient: DBClient, etlConfig: object) {
    super();
    // Mysql object to perform action of Mysql database
    this.mysqlClient = mysqlClient;
    // stl and table name
    this.tableName = etlConfig['tableName'].trim();
    this.searchColumn = etlConfig['searchColumn'].trim();
    this.searchColumnDataType = etlConfig['searchColumnDataType'] ? etlConfig['searchColumnDataType'].trim() : 'number';
    this.pk = etlConfig['pk'] ? etlConfig['pk'].trim() : this.searchColumn;
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

  public getPK() {
    return this.pk;
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
    if (this.searchColumnDataType !== 'number') {
      this.initialSavePoint['columnStartValue'] = this.initialSavePoint['columnStartValue'].trim();
      this.initialSavePoint['columnEndValue'] = this.initialSavePoint['columnEndValue'].trim();
    }
    this.currentSavePoint = {
      columnStartValue: this.initialSavePoint['columnStartValue'],
      columnEndValue: this.initialSavePoint['columnEndValue'],
      batchSize: Number(this.initialSavePoint['batchSize']),
      currentBatch: this.initialSavePoint.hasOwnProperty('currentBatch') ? Number(this.initialSavePoint['currentBatch']) : 0,
      totalBatches: 0,
      currentDate: moment().toISOString(),
    };
    await this.getMaxAndMinIds();
    const totalRecords = this.maxId - this.minId + 1;
    this.totalBatches = (this.currentSavePoint['batchSize'] > 0) ? Math.ceil(totalRecords / this.currentSavePoint['batchSize']) : 0;
    this.currentSavePoint['totalBatches'] = this.totalBatches;
  }

  protected async getTotalRecords(): Promise<any> {
    const includeSearchColumn = this.searchColumn !== this.pk;
    let query = `SELECT count(*) as total FROM ${this.tableName} where ${this.pk} between ? AND ? `;
    if (includeSearchColumn) {
      query = `${query} AND ${this.searchColumn} between ? AND ? `;
    }
    try {
      const results: Array<any> = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => {
        if (includeSearchColumn) {
          return transaction.query(query, this.minId, this.maxId, this.currentSavePoint['columnStartValue'], this.currentSavePoint['columnEndValue']);
        } else {
          return transaction.query(query, this.minId, this.maxId);
        }
      });

      if (results === null || results.length === 0 || !_.head(results).hasOwnProperty('total')) {
        return 0;
      }
      return Number(_.head(results)['total']);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  protected async getMaxAndMinIds() {
    const findEndVal = this.currentSavePoint['columnEndValue'] === '';
    let query = `SELECT  min(${this.pk}) as min_id, max(${this.pk}) as max_id, max(${this.searchColumn}) as end_value FROM ${this.tableName}`;
    if (findEndVal) {
      query = `${query} where ${this.searchColumn} >= ? `;
    } else {
      query = `${query} where ${this.searchColumn} between ? AND ? `;
    }
    try {
      const results: Array<any> = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => {
        if (findEndVal) {
          return transaction.query(query, this.currentSavePoint['columnStartValue']);
        } else {
          return transaction.query(query, this.currentSavePoint['columnStartValue'], this.currentSavePoint['columnEndValue']);
        }
      });
      this.minId = Number(_.head(results)['min_id']);
      this.maxId = Number(_.head(results)['max_id']);
      if (findEndVal) {
        this.currentSavePoint['columnEndValue'] = _.head(results)['end_value'];
      }
    } catch (e) {
      log.fatal(e, `Fail getting table ${this.tableName} getMaxAndMinIds`);
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

  /**
   * This get called at the end of each batch
   * @param newState has the current batch successfully run
   */
  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
      throw new Error(`Error found processing batch`);
    }
    // Note: Still have doubts here. Need Clarification
    if ((newState === EtlState.SAVE_ENDED)) {
      if (this.currentSavePoint['currentBatch'] === this.currentSavePoint['totalBatches']) {
        // Fininal batch is done. update the starting and ending save point
        this.updateFinalSavePoint();
        await this.updateStoredSavePoint(this.currentSavePoint);
        log.debug(`All done. Savepoint stored: ${this.getCurrentSavepoint()}`);
      } else {
        // finish one batch. update the batch number in the save point.
        // it will start from here again if something breaks in the next batch.
        await this.updateStoredSavePoint(this.currentSavePoint);
        log.debug(`Batch done. Savepoint stored: ${this.getCurrentSavepoint()}`);
      }
    }
  }

  /**
   * update the start and end points at the end if all batches finished running.
   */
  protected updateFinalSavePoint() {
    switch (this.searchColumnDataType) {
      case 'number':
        this.currentSavePoint['columnStartValue'] = Number(this.currentSavePoint['columnEndValue']) + 1;
        break;
      case 'date':
        this.currentSavePoint['columnStartValue'] = moment(this.currentSavePoint['columnEndValue']).add(1, 'days');
        break;
      case 'datetime':
        this.currentSavePoint['columnStartValue'] = this.currentSavePoint['columnEndValue'];
        break;
      default:
        throw new Error(`Invalid [searchColumnDataType] variable.`);
    }
    this.currentSavePoint['columnEndValue'] = '';
    this.currentSavePoint['batchSize'] = Number(this.initialSavePoint['batchSize']);
    this.currentSavePoint['currentBatch'] = 0;
    this.currentSavePoint['totalBatches'] = 0;
    this.currentSavePoint['currentDate'] = moment().toISOString();
  }

  protected async getRecords(): Promise<any> {
    const includeSearchColumn = this.searchColumn !== this.pk;
    const query = `SELECT  * FROM ${this.tableName} where ${this.pk} between ? AND ?`;
    const currentBatchStart = (Number(this.currentSavePoint['batchSize']) - 1) * Number(this.currentSavePoint['currentBatch']) + this.minId;
    const currentBatchEnd = currentBatchStart + Number(this.currentSavePoint['batchSize']) - 1;
    try {
      const results = await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => {
        if (includeSearchColumn) {
          return transaction.query(query, currentBatchStart, currentBatchEnd, this.currentSavePoint['columnStartValue'], this.currentSavePoint['columnEndValue']);
        } else {
          return transaction.query(query, currentBatchStart, currentBatchEnd);
        }
      });
      return Promise.resolve(results);
    } catch (e) {
      log.fatal(e, `Fail getting batch records ${this.tableName} from `);
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
    // There can be empty batches read the next batch in that case
    if ((data.length === 0) && this.hasNextBatch()) {
      return await this.getNextBatch();
    } else {
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
}
