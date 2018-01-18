import { WSAEACCES } from 'constants';
// External dependencies
import { must } from 'must';
import * as sinon from 'sinon';
import * as moment from 'moment';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
// Internal dependencies
import BaseApp from 'inceptum/dist/app/BaseApp';
import { DBClient, DBTransaction, BaseSingletonDefinition } from 'inceptum';
import { Transaction } from 'inceptum/dist/transaction/TransactionManager';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { SavepointPlugin } from '../../src/savepoints/SavepointPlugin';
import { DestinationPlugin } from '../../src/destinations/DestinationPlugin';
import { MySqlInsert, MysqlQueryHelper, MysqlQueryBuilderHelper } from '../../src/destinations/MySqlInsert';

const inputData = [{
  source_type: 0,
  transaction_id: 'JOB3646975',
  job_id: 3646975,
  partner_job_id: 0,
  dest: 'google',
  medium: 'cpc',
  landing_page_path: '/get_quotes_ppc?dest=ppc',
  device_category: 'tablet',
  browser: 'Safari',
  browser_version: '9.0',
  browser_size: '1020x700',
  created_by: 1,
  account: 'HIP',
  page_views: null,
  created_by_date: '2017-07-31 00:30:08',
  campaign: 'AA - Brand',
  adgroup: 'Brand|hipages|[E]',
  keyword: 'hipages',
  ad_matched_query: 'hipages',
},
{
  source_type: 0,
  transaction_id: 'JOB3646976',
  job_id: 3646976,
  partner_job_id: 60,
  dest: 'google',
  medium: 'cpc',
  landing_page_path: '/get_quotes_ppc',
  device_category: 'tablet',
  browser: 'Safari',
  browser_version: '10.0',
  browser_size: '1020x700',
  created_by: 1,
  account: 'HIP',
  page_views: 1,
  created_by_date: '2017-07-31 00:30:08',
  campaign: 'AA - Brand',
  adgroup: 'Brand|hipages|[E]',
  keyword: 'hipages',
  ad_matched_query: 'find hipages',
}];
const outputValues = [
  0,
  'JOB3646975',
  3646975,
  0,
  'google',
  'cpc',
  '/get_quotes_ppc?dest=ppc',
  'tablet',
  'Safari',
  '9.0',
  '1020x700',
  1,
  'HIP',
  null,
  '2017-07-31 00:30:08',
  'AA - Brand',
  'Brand|hipages|[E]',
  'hipages',
  'hipages',
  0,
  'JOB3646976',
  3646976,
  60,
  'google',
  'cpc',
  '/get_quotes_ppc',
  'tablet',
  'Safari',
  '10.0',
  '1020x700',
  1,
  'HIP',
  1,
  '2017-07-31 00:30:08',
  'AA - Brand',
  'Brand|hipages|[E]',
  'hipages',
  'find hipages',
];

const testConfig = {
  tableName: 'testTableName',
  bulkDeleteMatchFields: [
    'job_id',
    'transaction_id',
    'account',
    'created_by_date',
  ],
  deleteAllRecordsBeforeLoad: true,
};

class TestDBTransaction extends DBTransaction {
  // tslint:disable-next-line:prefer-function-over-method
  public async query(sql: string, ...bindArray: any[]): Promise<any> {
    return Promise.resolve({sql, bindArray});
  }
  // tslint:disable-next-line:prefer-function-over-method
  public doTransactionEnd(): Promise<void> {
    return Promise.resolve();
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected runQueryPrivate(sql: string, bindArrs?: any[]): Promise<any> {
    return Promise.resolve({sql, bindArrs});
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected runQueryAssocPrivate(sql: string, bindObj?: object): Promise<any> {
    return Promise.resolve({sql, bindObj});
  }
}
const dbTran = new TestDBTransaction(sinon.createStubInstance(Transaction));

class TestDBClient extends DBClient {
    // tslint:disable-next-line:prefer-function-over-method
    public async runInTransaction(readonly: boolean, func: (transaction: DBTransaction) => Promise<any>): Promise<any> {
        await func(sinon.createStubInstance(TestDBTransaction));
        return Promise.resolve('');
    }
}
const dbClient = sinon.createStubInstance(TestDBClient);

class HelperMySqlInsert extends MySqlInsert {
  public exposeGetFieldListValues(inputs: Array<object>, deleteField: string): Array<any> {
    return this.getFieldListValues(inputs, deleteField);
  }
  public exposeArrayOfObjectToListValues(inputs: Array<object>, deleteFields: Array<string>): Object {
    return this.arrayOfObjectToListValues(inputs, deleteFields);
  }
  public exposeArrayOfObjectToInsertQuery(inputs: Array<object>): MysqlQueryHelper {
    return this.arrayOfObjectToInsertQuery(inputs);
  }

}

suite('MySqlInsert', () => {
  const batch = new EtlBatch(inputData);
  // Copy the data in the batch to transformed
  batch.getRecords().map( (record) => (record.setTransformedData(record.getData())) );

  suite('Test public methods:', () => {
    test('initial config values', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      dest.getMySqlClient().must.be.instanceOf(DBClient);
      dest.getTableName().must.be.equal('testTableName');
      dest.getBulkDeleteMatchFields().must.be.an.array();
      dest.getBulkDeleteMatchFields().must.be.eql(testConfig.bulkDeleteMatchFields);
      dest.getDeleteAllRecordsBeforeLoad().must.be.false();
    });
    test('getQueryToAddMultipleRows', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const query = dest.getQueryToAddMultipleRows(inputData);
      query.query.must.be.equal('INSERT INTO testTableName (`source_type`,`transaction_id`,`job_id`,`partner_job_id`,`dest`,`medium`,`landing_page_path`,`device_category`,`browser`,`browser_version`,`browser_size`,`created_by`,`account`,`page_views`,`created_by_date`,`campaign`,`adgroup`,`keyword`,`ad_matched_query`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)  ON DUPLICATE KEY UPDATE  source_type=VALUES(source_type), transaction_id=VALUES(transaction_id), job_id=VALUES(job_id), partner_job_id=VALUES(partner_job_id), dest=VALUES(dest), medium=VALUES(medium), landing_page_path=VALUES(landing_page_path), device_category=VALUES(device_category), browser=VALUES(browser), browser_version=VALUES(browser_version), browser_size=VALUES(browser_size), created_by=VALUES(created_by), account=VALUES(account), page_views=VALUES(page_views), created_by_date=VALUES(created_by_date), campaign=VALUES(campaign), adgroup=VALUES(adgroup), keyword=VALUES(keyword), ad_matched_query=VALUES(ad_matched_query)');
      query.queryValues.must.be.eql(outputValues);
    });
    test('getQueryToDeleteRows table key', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const query = dest.getQueryToDeleteRows(inputData, ['job_id']);
      query.query.must.be.equal('DELETE FROM testTableName WHERE job_id in (?,?)');
      query.queryValues.must.be.eql([3646975, 3646976]);
    });
    test('getQueryToDeleteRows multykey', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const query = dest.getQueryToDeleteRows(inputData, testConfig.bulkDeleteMatchFields);
      query.query.must.be.equal('DELETE FROM testTableName WHERE (job_id = ? and transaction_id = ? and account = ? and created_by_date = ?) or (job_id = ? and transaction_id = ? and account = ? and created_by_date = ?)');
      query.queryValues.must.be.eql([3646975, 'JOB3646975', 'HIP', '2017-07-31 00:30:08', 3646976, 'JOB3646976', 'HIP', '2017-07-31 00:30:08']);
    });
    test('processRecordInTransaction', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const spy = sinon.spy(dbTran, 'query');
      await dest.processRecordInTransaction(inputData, dbTran);
      spy.callCount.must.be.equal(2);
      const spyCalls = spy.getCalls();
      spyCalls[0].args[0].must.be.equal('DELETE FROM testTableName WHERE (job_id = ? and transaction_id = ? and account = ? and created_by_date = ?) or (job_id = ? and transaction_id = ? and account = ? and created_by_date = ?)');
      spyCalls[0].args[1].must.be.eql(3646975);
      spyCalls[0].args[2].must.be.eql('JOB3646975');
      spyCalls[0].args[3].must.be.eql('HIP');
      spyCalls[0].args[4].must.be.eql('2017-07-31 00:30:08');
      spyCalls[0].args[5].must.be.eql(3646976);
      spyCalls[0].args[6].must.be.eql('JOB3646976');
      spyCalls[0].args[7].must.be.eql('HIP');
      spyCalls[0].args[8].must.be.eql('2017-07-31 00:30:08');
      const queryInsert = 'INSERT INTO testTableName (`source_type`,`transaction_id`,`job_id`,`partner_job_id`,`dest`,`medium`,`landing_page_path`,`device_category`,`browser`,`browser_version`,`browser_size`,`created_by`,`account`,`page_views`,`created_by_date`,`campaign`,`adgroup`,`keyword`,`ad_matched_query`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)  ON DUPLICATE KEY UPDATE  source_type=VALUES(source_type), transaction_id=VALUES(transaction_id), job_id=VALUES(job_id), partner_job_id=VALUES(partner_job_id), dest=VALUES(dest), medium=VALUES(medium), landing_page_path=VALUES(landing_page_path), device_category=VALUES(device_category), browser=VALUES(browser), browser_version=VALUES(browser_version), browser_size=VALUES(browser_size), created_by=VALUES(created_by), account=VALUES(account), page_views=VALUES(page_views), created_by_date=VALUES(created_by_date), campaign=VALUES(campaign), adgroup=VALUES(adgroup), keyword=VALUES(keyword), ad_matched_query=VALUES(ad_matched_query)';
      spyCalls[1].args[0].must.be.equal(queryInsert);
      spyCalls[1].args.length.must.be.equal(39);
      spyCalls[1].args.must.be.eql([queryInsert, ...outputValues]);
      spy.restore();
    });
    test('processRecords', async () => {
      const helpClient = new TestDBClient();
      const dest = new HelperMySqlInsert(helpClient, testConfig);
      const spy = sinon.spy(dest, 'processRecordInTransaction');
      await dest.processRecords(batch);
      spy.callCount.must.be.equal(1);
      const spyCalls = spy.getCalls();
      spyCalls[0].args[0].must.be.eql(inputData);
      spy.restore();
    });
    test('store', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const spy = sinon.spy(dest, 'processRecords');
      await dest.store(batch);
      spy.callCount.must.be.equal(1);
      const spyCalls = spy.getCalls();
      spyCalls[0].args[0].must.be.eql(batch);
      spy.restore();
    });

  });

  suite('Test private methods:', () => {
    test('arrayOfObjectToInsertQuery', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const data = dest.exposeArrayOfObjectToInsertQuery(inputData);
      data['queryValues'].must.be.eql(outputValues);
      data['queryText'].must.be.equal( '`source_type`,`transaction_id`,`job_id`,`partner_job_id`,`dest`,`medium`,`landing_page_path`,`device_category`,`browser`,`browser_version`,`browser_size`,`created_by`,`account`,`page_views`,`created_by_date`,`campaign`,`adgroup`,`keyword`,`ad_matched_query`');
      data['maskText'].must.be.equal('(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      data['onDuplicate'].must.be.equal(' ON DUPLICATE KEY UPDATE  source_type=VALUES(source_type), transaction_id=VALUES(transaction_id), job_id=VALUES(job_id), partner_job_id=VALUES(partner_job_id), dest=VALUES(dest), medium=VALUES(medium), landing_page_path=VALUES(landing_page_path), device_category=VALUES(device_category), browser=VALUES(browser), browser_version=VALUES(browser_version), browser_size=VALUES(browser_size), created_by=VALUES(created_by), account=VALUES(account), page_views=VALUES(page_views), created_by_date=VALUES(created_by_date), campaign=VALUES(campaign), adgroup=VALUES(adgroup), keyword=VALUES(keyword), ad_matched_query=VALUES(ad_matched_query)');
    });
    test('arrayOfObjectToListValues', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const data = dest.exposeArrayOfObjectToListValues(inputData, testConfig.bulkDeleteMatchFields);
      data.must.be.eql([{
        job_id: 3646975,
        transaction_id: 'JOB3646975',
        account: 'HIP',
        created_by_date: '2017-07-31 00:30:08',
      },
      {
        job_id: 3646976,
        transaction_id: 'JOB3646976',
        account: 'HIP',
        created_by_date: '2017-07-31 00:30:08',
      }]);
    });
    test('arrayOfObjectToListValues primary key ', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const data = dest.exposeArrayOfObjectToListValues(inputData, ['created_by_date']);
      data.must.be.eql([{
        created_by_date: '2017-07-31 00:30:08',
      }]);
    });
    test('arrayOfObjectToListValues primary key ', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const data = dest.exposeArrayOfObjectToListValues(inputData, ['dest', 'medium', 'device_category' , 'browser']);
      data.must.be.eql([{
        dest: 'google',
        medium: 'cpc',
        device_category: 'tablet',
        browser: 'Safari',
      }]);
    });
    test('getFieldListValues', async () => {
      const dest = new HelperMySqlInsert(dbClient, testConfig);
      const data = dest.exposeGetFieldListValues(inputData, 'job_id');
      data.must.be.eql([3646975, 3646976]);
    });
  });
  suite('Test using the plugin:', () => {
    const dbSingletonDefinition = new BaseSingletonDefinition(TestDBClient, 'EtlSavePoint');
    const app = new BaseApp();
    const context = app.getContext();
    context.registerSingletons(dbSingletonDefinition);
    const pluginObj = new DestinationPlugin('test_16');
    let dest: any;
    before('start', async () => {
      app.use(pluginObj);
      await app.start();
      dest = await context.getObjectByName('EtlDestination');
    });

    test('The type of object:', async () => {
      dest.must.be.instanceof(MySqlInsert);
    });

    test('Initial config values', async () => {
      dest.getMySqlClient().must.be.instanceOf(DBClient);
      dest.getTableName().must.be.equal('test_table');
      dest.getBulkDeleteMatchFields().must.be.an.array();
      dest.getBulkDeleteMatchFields().must.be.eql(testConfig.bulkDeleteMatchFields);
    });

    after('stop', async () => {
      await app.stop();
    });
  });
  suite('Test using the plugin no delete fields:', () => {
    test('Initial config values', async () => {
      const dbSingletonDefinition = new BaseSingletonDefinition(TestDBClient, 'EtlSavePoint');
      const app = new BaseApp();
      const context = app.getContext();
      context.registerSingletons(dbSingletonDefinition);
      const pluginObj = new DestinationPlugin('test_17');
      app.use(pluginObj);
      await app.start();
      const dest = await context.getObjectByName('EtlDestination');
      dest.getMySqlClient().must.be.instanceOf(DBClient);
      dest.getTableName().must.be.equal('test_table');
      dest.getBulkDeleteMatchFields().must.be.an.boolean();
      dest.getBulkDeleteMatchFields().must.be.equal(false);
      await app.stop();
    });
  });

});
