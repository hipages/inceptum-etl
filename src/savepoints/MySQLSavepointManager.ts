import { MySQLClient, DBTransaction } from 'inceptum';
import { LogManager } from 'inceptum';
import { EtlSavepointManager } from '../EtlSavepointManager';

const log = LogManager.getLogger(__filename);

/**
 * MySql implementation of EtlSavepointManager
 * Stores and retrives the save point for the ETL in MySQL database
 */
export class MySQLSavepointManager extends EtlSavepointManager {
  protected mysqlClient: MySQLClient;
  protected etlName;

  constructor(mysqlClient: MySQLClient, etlName: string) {
    super();
    this.mysqlClient = mysqlClient;
    this.etlName = etlName.trim();
  }

  /**
   * Get the savepoint from the database
   */
  public async getSavePoint(): Promise<string> {
    return await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction<any>) => {
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
    await this.mysqlClient.runInTransaction(false, (transaction: DBTransaction<any>) => {
      return transaction.query('UPDATE etls_savepoint SET savepoint=? WHERE etl_name=?', newSavepoint, this.etlName)
      .then((result) => {
        log.debug(`Storing savepoint: ${newSavepoint}`);
        return result;
      });
    });
  }
}
