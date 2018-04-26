import { MySQLClient } from 'inceptum';

export class MysqlDao {

    protected mysqlClient: MySQLClient;

    constructor(mysqlClient: MySQLClient) {
        this.mysqlClient = mysqlClient;
    }
}
