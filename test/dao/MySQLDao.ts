import { must } from 'must';
import * as sinon from 'sinon';
import { suite, test } from 'mocha-typescript';
import { DBClient } from 'inceptum';
import { MysqlDao } from '../../src/dao/MySQLDao';

@suite class MySQLDaoTest {

    @test createClass() {
        const dbClient = sinon.createStubInstance(DBClient);
        const mysqlDao = new MysqlDao(dbClient);
        mysqlDao.must.be.an.instanceOf(MysqlDao);
    }
}
