import * as moment from 'moment';
import { DBClient, DBTransaction } from 'inceptum';
import { EtlState, EtlBatch } from '../EtlBatch';
import { EtlDestination } from '../EtlDestination';

export interface UpdateQuery {
  sql: string,
  bind: Array<string | Number>,
}

export interface TableDetails {
  tableName: string,
  primaryKeyFieldName: string,
  modifiedByDateFieldName?: string,
}

export class MySqlUpdate extends EtlDestination {
  protected currentDateTime: string;
  protected dbClient: DBClient;
  protected tableName: string;
  protected primaryKeyFieldName: string;
  protected modifiedByDateFieldName?: string;

  public constructor(dbClient: DBClient, { tableName, primaryKeyFieldName, modifiedByDateFieldName }: TableDetails) {
    super();
    this.currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');
    this.dbClient = dbClient;
    this.tableName = tableName;
    this.primaryKeyFieldName = primaryKeyFieldName;
    this.modifiedByDateFieldName = modifiedByDateFieldName;
  }

  /**
   * Update the records
   * @param {EtlBatch} batch
   * @returns {Promise<void>}
   */
  public async store(batch: EtlBatch) {
    if (batch.getState() !== EtlState.ERROR) {
      const queries: UpdateQuery[] = batch.getTransformedRecords().map((record) => {
        if (record.getTransformedData().hasOwnProperty(this.primaryKeyFieldName)) {
          const query: UpdateQuery = {
            sql: `UPDATE \`${this.tableName}\` SET `,
            bind: [],
          };

          // SET
          const setParts = Object.keys(record.getTransformedData()).map((key) => {
            query.bind.push(record.getTransformedData()[key]);
            return `\`${key}\` = ?`;
          });

          if (this.modifiedByDateFieldName) {
            setParts.push(`\`${this.modifiedByDateFieldName}\` = ?`);
            query.bind.push(this.currentDateTime);
          }

          // Finalise
          query.sql += `${setParts.join(', ')} WHERE \`${this.primaryKeyFieldName}\` = ?`;
          query.bind.push(record.getTransformedData()[this.primaryKeyFieldName]);

          return query;
        }
      });

      await this.processRecords(queries);
    }
  }

  /**
   * @param {UpdateQuery[]} queries
   * @returns {Promise<any>}
   */
  public async processRecords(queries: UpdateQuery[]) {
    return await this.dbClient.runInTransaction(false, async (transaction: DBTransaction) => {
      return await Promise.all(queries.map((query) => transaction.query(query.sql, ...query.bind)));
    });
  }
}
