import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { EtlConfig } from '../../src/EtlConfig';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { EtlSavepointManager } from '../../src/EtlSavepointManager';
import { AdwordsKeywords } from '../../src/sources/AdwordsKeywords';

const adwordsConfig = EtlConfig.getConfig('sources.adwords.test');

class DummySavepointManager extends EtlSavepointManager {
  savepoint: string;
  constructor(savepoint: string) {
    super();
    this.savepoint = savepoint;
  }
  public async getSavePoint(): Promise<string> {
    return Promise.resolve(this.savepoint);
  }
  public async updateSavepoint(newSavepoint: string): Promise<void> {
    this.savepoint = newSavepoint;
    return Promise.resolve();
  }
}

class HelperAdwordsKeywords extends AdwordsKeywords {
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
}

suite('Adwordskeywords', () => {
  suite('Test dummy classes', () => {
    test('DummySavepointManager', async () => {
      const savePointManager = new DummySavepointManager('savepoint1');
      const savePoint = await savePointManager.getSavePoint();
      savePoint.must.be.equal('savepoint1');
      await savePointManager.updateSavepoint('New stored point');
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
  });

  suite('Adwordskeywords test', () => {
    const source = new AdwordsKeywords(adwordsConfig);
    const savePointManager = new DummySavepointManager('{"startDate":"20170701","endDate":"20170702","currentDate":"2017-07-26T10:40:16.097Z"}');
    test('Test initial savepoint manager', async () => {
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test savepoint formated', async () => {
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"startDate":"20170701","endDate":"20170702","currentDate":"2017-07-26T10:40:16.097Z"}');
      source.getInitialSavepointObject().must.be.eql({startDate: '20170701', endDate: '20170702', currentDate: '2017-07-26T10:40:16.097Z'});
    });
  });

  suite('Adwordskeywords test private methods', () => {
    const savePointManager = new DummySavepointManager('{"startDate":"20170701","endDate":"20170702","totalBatches":2,"currentDate":"2017-07-26T10:40:16.097Z"}');
    test('Test getNextSavePoint', async () => {
      const source = new HelperAdwordsKeywords(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"startDate":"20170701","endDate":"20170702","totalBatches":2,"currentDate":"2017-07-26T10:40:16.097Z"}');
      const savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('20170702');
      savePoint['endDate'].must.be.equal('20170703');
    });
    test('Test update savepoint', async () => {
      const source = new HelperAdwordsKeywords(adwordsConfig);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      source.getNextBatch();
      source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.exposeStringToSavePoint(current);
      sourceSave['startDate'].must.be.equal('20170702');
      sourceSave['endDate'].must.be.equal('20170703');
    });
  });
});
