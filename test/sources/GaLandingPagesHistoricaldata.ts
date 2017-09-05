import { WSAEACCES } from 'constants';
// External dependencies
import { must } from 'must';
import * as sinon from 'sinon';
import * as moment from 'moment';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
// Internal dependencies
import { DBClient, DBTransaction } from 'inceptum';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { GaLandingPagesHistoricaldata } from '../../src/sources/GaLandingPagesHistoricaldata';
// Test Config
const gaConfig = utilConfig.get('sources.gaLandingPagesHistoricaldata.test_8');
const savePointConfig = utilConfig.get('savepoints.static.test_8.savepoint');

const gaConfig_9 = utilConfig.get('sources.gaDataPartnersHistoricaldata.test_9');
const savePointConfig_9 = utilConfig.get('savepoints.static.test_9.savepoint');

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

class TestDBClient extends DBClient {
    public runInTransaction(readonly: boolean, func: (transaction: DBTransaction) => Promise<any>): Promise<any> {
        return Promise.resolve(123);
    }
}
const dbClient = sinon.createStubInstance(TestDBClient);
// dbClient.runInTransaction.returns(results);


class HelperGaLandingPagesHistoricaldata extends GaLandingPagesHistoricaldata {
  // Overwrite getNextBatch to test changing savepoint
  public async getNextBatch(): Promise<EtlBatch> {
    if (this.hasNextBatch()) {
      this.currentSavePoint = this.getNextSavePoint();
    }
    const batch =  new EtlBatch([], this.currentSavePoint['currentBatch'], this.currentSavePoint['totalBatches'], `${this.currentSavePoint['startDate']}:${this.currentSavePoint['endDate']}:${this.currentSavePoint['currentBatch']}`);
    batch.registerStateListener(this);
    return batch;
  }
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

suite('GaLandingPagesHistoricaldata', () => {

  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial savepoint manager', async () => {
      const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint', async () => {
      const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
    });
    test('Test defaultSavePoint', async () => {
      const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['currentDate'].must.not.be.null();
    });
    test('Test current savePoint', async () => {
      const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
    });
    test('Test hasNextBatch', async () => {
      const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.not.be.true();
    });
  });

  suite('Test private methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
   });
    test('Test savePointToString', async () => {
      const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        currentBatch: 1,
        totalBatches: 1,
        currentDate: '2017-08-01T01:14:37.995Z',
      });
      savePoint.must.be.equal('{"currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
    });
    test('Test change state', async () => {
      const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test getNextSavePoint', async () => {
      const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(1);
      let savePoint = source.exposeGetNextSavePoint();
      savePoint['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(1);
      await source.getNextBatch();
      savePoint = source.exposeGetNextSavePoint();
      savePoint['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(1);
    });
    test('Test update savepoint', async () => {
      const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.exposeStringToSavePoint(current);
      sourceSave['currentBatch'].must.be.equal(1);
      sourceSave['totalBatches'].must.be.equal(1);
    });
    test('Test getRecords', async () => {
        dbClient.runInTransaction.returns(inputLandingPages);
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig.sourceOptions);
        await source.initSavePoint(savePointManager);
        const batch = await source.exposegetRecords();
        batch.must.be.equal(inputLandingPages);
      });
  });
});

suite('GaDataPartnersHistoricaldata', () => {

    suite('Test public methods:', () => {
      const savePointManager = new StaticSavepointManager(savePointConfig_9);
      test('Test initial savepoint manager', async () => {
        const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const manager = source.getSavepointManager();
        manager.must.be.equal(savePointManager);
      });
      test('Test empty savepoint', async () => {
        const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(new StaticSavepointManager(''));
        const savePoint = source.getInitialSavepointObject();
      });
      test('Test defaultSavePoint', async () => {
        const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const savePoint = source.defaultSavePoint();
        savePoint['currentDate'].must.not.be.null();
      });
      test('Test current savePoint', async () => {
        const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const savePoint = source.getCurrentSavepointObject();
        savePoint['currentBatch'].must.be.equal(1);
        savePoint['totalBatches'].must.be.equal(1);
      });
      test('Test hasNextBatch', async () => {
        const source = new GaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        source.hasNextBatch().must.not.be.true();
      });
    });

    suite('Test private methods:', () => {
      const savePointManager = new StaticSavepointManager(savePointConfig_9);
      test('Test stringToSavePoint', async () => {
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const savePoint = source.exposeStringToSavePoint(savePointConfig);
        savePoint['currentBatch'].must.be.equal(1);
        savePoint['totalBatches'].must.be.equal(1);
     });
      test('Test savePointToString', async () => {
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const savePoint = source.exposeSavePointToString({
          currentBatch: 1,
          totalBatches: 1,
          currentDate: '2017-08-01T01:14:37.995Z',
        });
        savePoint.must.be.equal('{"currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
      });
      test('Test change state', async () => {
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const batch = await source.getNextBatch();
        await batch.setState(EtlState.ERROR);
        source.getErrorFound().must.be.true();
      });
      test('Test getNextSavePoint', async () => {
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        const savePointInit = source.getCurrentSavepointObject();
        savePointInit['currentBatch'].must.be.equal(1);
        savePointInit['totalBatches'].must.be.equal(1);
        let savePoint = source.exposeGetNextSavePoint();
        savePoint['currentBatch'].must.be.equal(0);
        savePointInit['totalBatches'].must.be.equal(1);
        await source.getNextBatch();
        savePoint = source.exposeGetNextSavePoint();
        savePoint['currentBatch'].must.be.equal(0);
        savePointInit['totalBatches'].must.be.equal(1);
      });
      test('Test update savepoint', async () => {
        const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
        await source.initSavePoint(savePointManager);
        // Emulates 2 batches call
        await source.getNextBatch();
        await source.getNextBatch();
        await source.stateChanged(EtlState.SAVE_ENDED);
        const current = source.getCurrentSavepoint();
        const finalSavePoint = await savePointManager.getSavePoint();
        finalSavePoint.must.be.equal(current);
        const sourceSave = source.exposeStringToSavePoint(current);
        sourceSave['currentBatch'].must.be.equal(1);
        sourceSave['totalBatches'].must.be.equal(1);
      });
      test('Test getGaPartnersRecords', async () => {
          dbClient.runInTransaction.returns(inputPartnersData);
          const source = new HelperGaLandingPagesHistoricaldata(dbClient, gaConfig_9.sourceOptions);
          await source.initSavePoint(savePointManager);
          const batch = await source.exposegetRecords();
          batch.must.be.equal(inputPartnersData);
      });
    });
  });
