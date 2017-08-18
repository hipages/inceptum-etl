import { DBClient } from 'inceptum';

export class MysqlDao {

    protected mysqlClient: DBClient;

    constructor(mysqlClient: DBClient) {
        this.mysqlClient = mysqlClient;
    }
}
