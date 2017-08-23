import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as moment from 'moment';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { AdwordsReports } from '../../src/sources/AdwordsReports';

const adwordsConfig = utilConfig.get('sources.adwordsreports.test_2');
const savePointConfig = utilConfig.get('savepoints.static.test_2.savepoint');
// tslint:disable-next-line
const yesterday = moment().subtract(1, 'days');
const today = moment();

class HelperAdwordsReports extends AdwordsReports {
  // Overrite getNextBatch to test changing savepoint
  public async getNextBatch(): Promise<EtlBatch> {
    if (this.hasNextBatch()) {
      this.currentSavePoint = this.getNextSavePoint();
    }
    const batch =  new EtlBatch([], this.currentSavePoint['currentBatch'], this.totalBatches, this.currentSavePoint['startDate']);
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
}

suite('AdwordsReports', () => {
  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial savepoint formated', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"startDate":"20170731","endDate":"20170801","currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
      source.getInitialSavepointObject().must.be.eql({startDate: '20170731', endDate: '20170801', currentBatch: 1, totalBatches: 1, currentDate: '2017-08-01T01:14:37.995Z'});
    });
    test('Test initial savepoint manager', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['startDate'].must.be.equal(yesterday.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
    });
    test('Test defaultSavePoint', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['startDate'].must.be.equal(yesterday.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
    });
    test('Test current savePoint', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('20170801');
      savePoint['endDate'].must.be.equal('20170802');
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(2);
    });
    test('Test hasNextBatch', async () => {
      const source = new AdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
    test('Test query in config', async () => {
      const source = new AdwordsReports(adwordsConfig);
      source.getQuery().must.be.equal('SELECT AccountDescriptiveName, CampaignName, CampaignId, AdGroupName, AdGroupId, CriteriaParameters, CriteriaId, KeywordMatchType, AdFormat, CreativeId, Device, Date, GclId, Clicks, ClickType, ExternalCustomerId, Page, Slot FROM   CLICK_PERFORMANCE_REPORT');
    });
  });

  suite('Test private methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['startDate'].must.be.equal('20170731');
      savePoint['endDate'].must.be.equal('20170801');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
   });
    test('Test savePointToString', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
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
    test('Test change state', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test getNextSavePoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['startDate'].must.be.equal('20170801');
      savePointInit['endDate'].must.be.equal('20170802');
      savePointInit['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(2);
      let savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('20170801');
      savePoint['endDate'].must.be.equal('20170802');
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(2);
      await source.getNextBatch();
      await source.getNextBatch();
      savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('20170802');
      savePoint['endDate'].must.be.equal('20170803');
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(2);
    });
    test('Test update savepoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.getCurrentSavepointObject();
      sourceSave['startDate'].must.be.equal('20170801');
      sourceSave['endDate'].must.be.equal('20170802');
      sourceSave['currentBatch'].must.be.equal(2);
      sourceSave['totalBatches'].must.be.equal(2);
    });
  });
});
