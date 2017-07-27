import { MysqlClient, MysqlTransaction } from 'inceptum';

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
      return transaction.query('SELECT val FROM savepoint WHERE etlName=?', this.etlName);
    });
  }

  /**
   * Save the savepoint in the database
   * @param newSavepoint
   */
  public async updateSavepoint(newSavepoint: string): Promise<void> {
    await this.mysqlClient.runInTransaction(false, (transaction: MysqlTransaction) => {
      return transaction.query('UPDATE savepoint SET val=? WHERE etlName=?', newSavepoint, this.etlName);
    });
  }
}
