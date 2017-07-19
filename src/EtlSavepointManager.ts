import { MysqlClient, MysqlTransaction } from 'inceptum';

export abstract class EtlSavepointManager {
  async abstract getSavePoint(): Promise<String>;
  async abstract updateSavepoint(newSavepoint: String);
}

export class MySQLEtlSavepointManager extends EtlSavepointManager {
  mysqlClient: MysqlClient;
  etlName: String;

  constructor(mysqlClient: MysqlClient, etlName: String) {
    super();
    this.mysqlClient = mysqlClient;
    this.etlName = etlName;
  }

  async getSavePoint(): Promise<String> {
    return this.mysqlClient.runInTransaction(true, (transaction: MysqlTransaction) => {
      return transaction.query('SELECT val FROM savepoint WHERE etlName=?', this.etlName);
    });
  }

  async updateSavepoint(newSavepoint: String) {
    this.mysqlClient.runInTransaction(false, (transaction: MysqlTransaction) => {
      return transaction.query('UPDATE savepoint SET val=? WHERE etlName=?', newSavepoint, this.etlName);
    });
  }
}
