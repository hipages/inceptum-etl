import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlBatch, EtlState } from '../src/EtlBatch';
import { EtlSavepointManager } from '../src/EtlSavepointManager';
import { EtlSource } from '../src/EtlSource';

class testSource extends EtlSource {
  protected savePointToString(savePoint: Object) {
    return savePoint['value'];
  }
  protected stringTosavePoint(savePoint: String) {
    return {
      value: savePoint,
    }
  }
  public async getNextBatch(): Promise<EtlBatch> {
    const batch =  new EtlBatch([{id: 1, name: 'part 1'}]);
    return Promise.resolve(batch);
  }
  public hasNextBatch(): boolean {
    return false;
  }
  public stateChanged(newState: EtlState) {
    this.updateStoredSavePoint({value: 'New stored point'});
  }
}

class DummySavepointManager extends EtlSavepointManager {
  savepoint: String;
  constructor(savepoint: String) {
    super();
    this.savepoint = savepoint;
  }
  public async getSavePoint(): Promise<String> {
    return Promise.resolve(this.savepoint);
  }
  public async updateSavepoint(newSavepoint: String) {
    this.savepoint = newSavepoint;
    return Promise.resolve();
  }
}

suite('EtlSourse', () => {
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

  suite('Etl source test', () => {
    test('Test initial savepoint manager', async () => {
      const source = new testSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test get initial savepoint', async () => {
      const source = new testSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('savepoint1');
      source.getCurrentSavepoint().must.be.equal('savepoint1');
    });
    test('Test update savepoint', async () => {
      const source = new testSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      source.stateChanged(EtlState.SAVE_ENDED);
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
  });
});
