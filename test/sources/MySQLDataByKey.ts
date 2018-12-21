// External dependencies
import { must } from 'must';
import * as sinon from 'sinon';
import * as utilConfig from 'config';
import { suite, test } from 'mocha-typescript';
// Internal dependencies
import BaseApp from 'inceptum/dist/app/BaseApp';
import { MySQLClient, DBTransaction, BaseSingletonDefinition } from 'inceptum';
import { EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { SourcePlugin } from '../../src/sources/SourcePlugin';
import { MySQLDataByKey } from '../../src/sources/MySQLDataByKey';

// Test Config
const gaConfig = utilConfig.get('etls.test_8.source');
const savePointConfig = utilConfig.get('etls.test_8.savepoint.savepoint');

const inputLandingPages = [{
    source_type: 0,
    transaction_id: 'JOB3646975',
    job_id: 3646975,
    partner_job_id: 0,
    source: 'google',
    medium: 'cpc',
    landing_page_path: '/get_quotes_ppc?source=ppc',
    device_category: 'tablet',
    browser: 'Safari',
    browser_version: '9.0',
    browser_size: '1020x700',
    created_by: 1,
    account: 'HIP',
    page_views: null,
    created_by_date: '2017-07-31 00:30:08',
    campiagn: 'AA - Brand',
    adgroup: 'Brand|hipages|[E]',
    keyword: 'hipages',
    ad_matched_query: 'hipages',
}];
const outputLandingPages = {
    source_type: 0,
    transaction_id: 'JOB3646975',
    job_id: 3646975,
    partner_job_id: 0,
    source: 'google',
    medium: 'cpc',
    landing_page_path: '/get_quotes_ppc?source=ppc',
    device_category: 'tablet',
    browser: 'Safari',
    browser_version: '9.0',
    browser_size: '1020x700',
    created_by: 1,
    app_code: 'HIP',
    source_name: 'Google Analytics',
    source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
    source_account: 'HIP',
    page_views: null,
    record_created_date: '2017-07-31 00:30:08',
    landing_content_group5: 'Others',
    campiagn: 'AA - Brand',
    adgroup: 'Brand|hipages|[E]',
    keyword: 'hipages',
    ad_matched_query: 'hipages',
};

const inputPartnersData = [{
  source_type: 0,
  transaction_id: 'JOB3646975',
  job_id: 3646975,
  partner_job_id: 0,
  campaign_name: 'AA - Brand',
  source: 'google',
  ad_group_name: 'Brand|hipages|[E]',
  medium: 'cpc',
  keywords: 'hipages',
  landing_page_path: '/get_quotes_ppc?source=ppc',
  matched_query: 'hipages',
  device_category: 'tablet',
  browser: 'Safari',
  browser_version: '9.0',
  browser_size: '1020x700',
  created_by: 1,
  report_date: '2017-07-31 00:30:08',
  account: 'HIP',
  created_by_date: '2017-07-31 00:30:08',
}];
const outputPartnersData = [{
  source_type: 0,
  transaction_id: 'JOB3646975',
  job_id: 3646975,
  partner_job_id: 0,
  campaign_name: 'AA - Brand',
  source: 'google',
  ad_group_name: 'Brand|hipages|[E]',
  medium: 'cpc',
  keywords: 'hipages',
  landing_page_path: '/get_quotes_ppc?source=ppc',
  matched_query: 'hipages',
  device_category: 'tablet',
  browser: 'Safari',
  browser_version: '9.0',
  browser_size: '1020x700',
  created_by: 1,
  app_code: 'HIP',
  source_name: 'Google Analytics',
  source_time_zone: null,
  report_date: '2017-07-31 00:30:08',
  source_account: 'HIP',
  record_created_date: '2017-07-31 00:30:08',
  landing_content_group5: 'Others',
}];

const maxMinAndTotals = [{total: 2, min_id: 1, max_id: 15, end_value: 15}];

class TestDBClient extends MySQLClient {
    // tslint:disable-next-line:prefer-function-over-method
    public runInTransaction(readonly: boolean, func: (transaction) => Promise<any>): Promise<any> {
        return Promise.resolve([{total: 2, min_id: 1, max_id: 15, end_value: 15}]);
    }
}
const dbClient = sinon.createStubInstance(TestDBClient);

class HelperMySQLDataByKey extends MySQLDataByKey {
  public exposeGetNextSavePoint() {
    return this.getNextSavePoint();
  }
  public exposeStringToSavePoint(savePoint: string) {
    return this.stringToSavePoint(savePoint);
  }
  public exposeSavePointToString(savePoint: object) {
    return this.savePointToString(savePoint);
  }
  public exposegetRecords() {
    return this.getRecords();
  }
}

suite('MySQLDataByKey', () => {

  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial config values', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      source.getMysqlClient().must.be.instanceOf(MySQLClient);
      source.getTableName().must.be.equal('landing_pages_table');
      source.getSearchColumn().must.be.equal('id');
      source.getPK().must.be.equal('id');
    });
    test('Test initial savepoint manager', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint throw error', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      try {
        await source.initSavePoint(new StaticSavepointManager(''));
        false.must.be.true();
      } catch (err) {
        err.message.must.be.equal('Empty savepoint found to run source');
      }
    });
    test('Test empty savepoint init fail', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      try {
        await source.initSavePoint(new StaticSavepointManager(''));
        false.must.be.true();
      } catch (err) {
        err.message.must.be.equal('Empty savepoint found to run source');
      }
    });
    test('Test missing fields in savepoint throw error', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      try {
        await source.initSavePoint(new StaticSavepointManager('{"notValue":0}'));
        false.must.be.true();
      } catch (err) {
        err.message.must.be.equal('Missing fields in savepoint');
      }
    });
    test('Test defaultSavePoint throw error', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      try {
        source.defaultSavePoint();
        false.must.be.true();
      } catch (err) {
        err.message.must.be.equal('Empty savepoint found to run source');
      }
    });
    test('Test current savePoint', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['columnStartValue'].must.be.equal(48172195);
      savePoint['columnEndValue'].must.be.equal(48172196);
      savePoint['batchSize'].must.be.equal(10);
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(2);
    });
    test('Test hasNextBatch', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
  });

  suite('Test private methods:', () => {
    dbClient.runInTransaction.returns(maxMinAndTotals);
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['columnStartValue'].must.be.equal(48172195);
      savePoint['columnEndValue'].must.be.equal(48172196);
      savePoint['batchSize'].must.be.equal(10);
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(0);
    });
    test('Test savePointToString', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        columnStartValue: 48172195,
        columnEndValue: 48172196,
        batchSize: 10,
        currentBatch: 0,
        totalBatches: 0,
        currentDate: '2017-08-28T17:42:41.349Z',
      });
      savePoint.must.be.equal('{"columnStartValue":48172195,"columnEndValue":48172196,"batchSize":10,"currentBatch":0,"totalBatches":0,"currentDate":"2017-08-28T17:42:41.349Z"}');
    });
    test('Test change state', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      dbClient.runInTransaction.returns(inputLandingPages);
      const batch = await source.getNextBatch();
      batch.setState(EtlState.ERROR).then( (result) => {
        false.must.be.true();
      }).catch( (err) => {
        err.message.must.be.equal('Error found processing batch');
      });
    });
    test('Test getNextSavePoint', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['columnStartValue'].must.be.equal(48172195);
      savePointInit['columnEndValue'].must.be.equal(48172196);
      savePointInit['batchSize'].must.be.equal(10);
      savePointInit['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(2);

      let savePoint = source.exposeGetNextSavePoint();
      savePoint['columnStartValue'].must.be.equal(48172195);
      savePoint['columnEndValue'].must.be.equal(48172196);
      savePoint['batchSize'].must.be.equal(10);
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(2);

      dbClient.runInTransaction.returns(inputLandingPages);
      await source.getNextBatch();
      savePoint = source.exposeGetNextSavePoint();
      savePoint['columnStartValue'].must.be.equal(48172195);
      savePoint['columnEndValue'].must.be.equal(48172196);
      savePoint['batchSize'].must.be.equal(10);
      savePoint['currentBatch'].must.be.equal(2);
      savePoint['totalBatches'].must.be.equal(2);
    });
    test('Test update savepoint', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      dbClient.runInTransaction.returns(inputLandingPages);
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const savePoint = source.exposeStringToSavePoint(current);
      savePoint['columnStartValue'].must.be.equal(48172197);
      savePoint['columnEndValue'].must.be.equal('');
      savePoint['batchSize'].must.be.equal(10);
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(0);
    });
    test('Test getRecords', async () => {
        dbClient.runInTransaction.returns(maxMinAndTotals);
        const source = new HelperMySQLDataByKey(dbClient, gaConfig.sourceOptions);
        await source.initSavePoint(savePointManager);
        dbClient.runInTransaction.returns(inputLandingPages);
        const batch = await source.exposegetRecords();
        batch.must.be.equal(inputLandingPages);
      });
  });

  suite('Test using the plugin:', () => {
    const app = new BaseApp();
    const context = app.getContext();
    const dbSingletonDefinition = new BaseSingletonDefinition(TestDBClient, 'GA');
    context.registerSingletons(dbSingletonDefinition);
    const pluginObj = new SourcePlugin('test_9');
    app.use(pluginObj);

    test('Test the type of object:', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      await app.start();
      const source = await context.getObjectByName('EtlSource');
      source.must.be.instanceof(MySQLDataByKey);
      await app.stop();
    });
    test('Test initial config values', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = await context.getObjectByName('EtlSource');
      source.getTableName().must.be.equal('job_table');
      source.getSearchColumn().must.be.equal('job_id');
    });
    test('Test configuration: getTotalBatches', async () => {
      dbClient.runInTransaction.returns(maxMinAndTotals);
      const source = await context.getObjectByName('EtlSource');
      source.getTotalBatches().must.be.equal(0);
    });
  });

});
