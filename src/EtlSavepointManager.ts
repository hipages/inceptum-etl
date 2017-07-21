import { MysqlClient, MysqlTransaction } from 'inceptum';

/**
 * Stores and retrives the save point for the ETL
 */
export abstract class EtlSavepointManager {
  public async abstract getSavePoint(): Promise<String>;
  public async abstract updateSavepoint(newSavepoint: String);
}

/**
 * MySql implementation of EtlSavepointManager
 * Stores and retrives the save point for the ETL in MySQL database
 */
export class MySQLEtlSavepointManager extends EtlSavepointManager {
  mysqlClient: MysqlClient;
  etlName: String;

  /**
   * Constructor gets the MysqlClient and the etl name
   * @param mysqlClient
   * @param etlName
   */
  // constructor(mysqlClient: MysqlClient, etlName: String) {
  constructor(mysqlClient: MysqlClient, etlName: String) {
    super();
    this.mysqlClient = mysqlClient;
    this.etlName = etlName;
  }

  /**
   * Get the savepoint from the database
   */
  public async getSavePoint(): Promise<String> {
    return this.mysqlClient.runInTransaction(true, (transaction: MysqlTransaction) => {
      return transaction.query('SELECT val FROM savepoint WHERE etlName=?', this.etlName);
    });
  }

  /**
   * Save the savepoint in the database
   * @param newSavepoint
   */
  public async updateSavepoint(newSavepoint: String) {
    this.mysqlClient.runInTransaction(false, (transaction: MysqlTransaction) => {
      return transaction.query('UPDATE savepoint SET val=? WHERE etlName=?', newSavepoint, this.etlName);
    });
  }
}
