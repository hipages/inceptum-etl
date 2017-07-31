import { MysqlClient, MysqlTransaction } from 'inceptum';
import { LogManager } from 'inceptum';

const log = LogManager.getLogger();

/**
 * Stores and retrives the save point for the ETL
 */
export abstract class EtlSavepointManager {
  public async abstract getSavePoint(): Promise<string>;
  public async abstract updateSavepoint(newSavepoint: string);
}

/**
 * MySql implementation of EtlSavepointManager
 * Stores and retrives the save point for the ETL in MySQL database
 */
export class MySQLEtlSavepointManager extends EtlSavepointManager {
  mysqlClient: MysqlClient;
  etlName: string;

  /**
   * Constructor gets the MysqlClient and the etl name
   * @param mysqlClient
   * @param etlName
   */
  // constructor(mysqlClient: MysqlClient, etlName: string) {
  constructor(mysqlClient: MysqlClient, etlName: string) {
    super();
    this.mysqlClient = mysqlClient;
    this.etlName = etlName;
  }

  /**
   * Get the savepoint from the database
   */
  public async getSavePoint(): Promise<string> {
    return await this.mysqlClient.runInTransaction(true, (transaction: MysqlTransaction) => {
      return transaction.query('SELECT savepoint FROM etls_savepoint WHERE etl_name=?', this.etlName)
      .then((rows) => {
        if (rows === null || rows.length === 0 || !rows[0].hasOwnProperty('savepoint')) {
          return '';
        }
        return rows[0]['savepoint'];
      });
    });
  }

  /**
   * Save the savepoint in the database
   * @param newSavepoint
   */
  public async updateSavepoint(newSavepoint: string): Promise<void> {
    await this.mysqlClient.runInTransaction(false, (transaction: MysqlTransaction) => {
      return transaction.query('UPDATE etls_savepoint SET savepoint=? WHERE etl_name=?', newSavepoint, this.etlName)
      .then((result) => {
        log.debug(`Storing savepoint: ${newSavepoint}`);
        return result;
      });
    });
  }
}
