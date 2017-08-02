import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlBatch, EtlState } from '../src/EtlBatch';
import { EtlSavepointManager } from '../src/EtlSavepointManager';
import { EtlSource } from '../src/EtlSource';

class TestSource extends EtlSource {
  // tslint:disable-next-line:prefer-function-over-method
  protected savePointToString(savePoint: object) {
    return savePoint['value'];
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected stringToSavePoint(savePoint: string) {
    return {
      value: savePoint,
    };
  }
  // tslint:disable-next-line:prefer-function-over-method
  public async getNextBatch(): Promise<EtlBatch> {
    const batch =  new EtlBatch([{id: 1, name: 'part 1'}]);
    return Promise.resolve(batch);
  }
  // tslint:disable-next-line:prefer-function-over-method
  public hasNextBatch(): boolean {
    return false;
  }
  public async stateChanged(newState: EtlState): Promise<void> {
    this.updateStoredSavePoint({value: 'New stored point'});
  }
}

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

suite('EtlSource', () => {
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
      const source = new TestSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test get initial savepoint', async () => {
      const source = new TestSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('savepoint1');
      source.getCurrentSavepoint().must.be.equal('savepoint1');
    });
    test('Test get savepoint object', async () => {
      const source = new TestSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      const value1 = source.getInitialSavepointObject();
      value1.must.be.eql({value: 'savepoint1'});
      const value2 = source.getCurrentSavepointObject();
      value2.must.be.eql({value: 'savepoint1'});
    });
    test('Test update savepoint', async () => {
      const source = new TestSource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      await source.stateChanged(EtlState.SAVE_ENDED);
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
  });
});
