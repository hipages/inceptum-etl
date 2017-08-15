import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as moment from 'moment';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { GoogleAnalyticsJobs } from '../../src/sources/GoogleAnalyticsJobs';

const gaConfig = utilConfig.get('sources.gatransactions.test_5');
const savePointConfig = utilConfig.get('savepoints.static.test_5.savepoint');
// tslint:disable-next-line
const twoDaysAgo = moment().subtract(2, 'days');
const lastDay = moment();

class HelperGoogleAnalytics extends GoogleAnalyticsJobs {
  // Overrite getNextBatch to test changing savepoint
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

  public getParam1Rages(): object {
    return this.gaParams['dateRanges'];
  }
  public getParam2Rages(): object {
    return this.gaParams2['dateRanges'];
  }
}

suite('GoogleAnalyticsJobs', () => {

  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial savepoint manager', async () => {
      const source = new GoogleAnalyticsJobs(gaConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint', async () => {
      const source = new GoogleAnalyticsJobs(gaConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['startDate'].must.be.equal(twoDaysAgo.format('YYYY-MM-DD'));
      savePoint['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
    });
    test('Test defaultSavePoint', async () => {
      const source = new GoogleAnalyticsJobs(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['startDate'].must.be.equal(twoDaysAgo.format('YYYY-MM-DD'));
      savePoint['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
    });
    test('Test current savePoint', async () => {
      const source = new GoogleAnalyticsJobs(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('2017-08-11');
      savePoint['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(1);
    });
    test('Test hasNextBatch', async () => {
      const source = new GoogleAnalyticsJobs(gaConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
  });

  suite('Test private methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['startDate'].must.be.equal('2017-08-10');
      savePoint['endDate'].must.be.equal('2017-08-12');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
   });
    test('Test savePointToString', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        startDate: '2017-08-10',
        endDate: '2017-08-12',
        currentBatch: 1,
        totalBatches: 1,
        currentDate: '2017-08-01T01:14:37.995Z',
      });
      savePoint.must.be.equal('{"startDate":"2017-08-10","endDate":"2017-08-12","currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
    });
    test('Test getParam1Rages', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const ranges = source.getParam1Rages();
      ranges['startDate'].must.be.equal('2017-08-11');
      ranges['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
    });
    test('Test getParam2Rages', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const ranges = source.getParam2Rages();
      ranges['startDate'].must.be.equal('2017-08-11');
      ranges['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
    });
    test('Test change state', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test getNextSavePoint', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['startDate'].must.be.equal('2017-08-11');
      savePointInit['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      savePointInit['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(1);
      let savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('2017-08-11');
      savePoint['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(1);
      await source.getNextBatch();
      savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      savePoint['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(1);
    });
    test('Test update savepoint', async () => {
      const source = new HelperGoogleAnalytics(gaConfig);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.exposeStringToSavePoint(current);
      sourceSave['startDate'].must.be.equal('2017-08-11');
      sourceSave['endDate'].must.be.equal(lastDay.format('YYYY-MM-DD'));
      sourceSave['currentBatch'].must.be.equal(1);
      sourceSave['totalBatches'].must.be.equal(1);
    });
  });
});
