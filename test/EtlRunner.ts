import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlBatch, EtlState } from '../src/EtlBatch';
import { EtlConfig } from '../src/EtlConfig';
import { EtlRunner } from '../src/EtlRunner';
import { EtlSavepointManager } from '../src/EtlSavepointManager';
import { EtlSource } from '../src/EtlSource';
import { EtlTransformer } from '../src/EtlTransformer';
import { EtlDestination } from '../src/EtlDestination';

class DummySource extends EtlSource {
  batches = 1;
  constructor(batches= 1) {
    super();
    this.batches = batches;
  }
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
  public async getNextBatch(): Promise<EtlBatch> {
    const batch =  new EtlBatch([{id: 1, name: 'part 1'}]);
    batch.registerStateListener(this);
    return Promise.resolve(batch);
  }
  public hasNextBatch(): boolean {
    const hasBatch = this.batches > 0;
    this.batches--;
    return hasBatch;
  }
  public stateChanged(newState: EtlState) {
    if (newState === EtlState.SAVE_ENDED) {
      this.updateStoredSavePoint({value: 'New stored point'});
    }
  }
}

class DummyTransformer extends EtlTransformer {
  setErrors = false;
  constructor(setErrors = false) {
    super();
    this.setErrors = setErrors;
  }
  public async transform(batch: EtlBatch): Promise<void> {
    batch.getRecords().map( (record) => {
      if (this.setErrors) {
        record.setState(EtlState.ERROR);
      } else {
        record.setTransformedData(record.getData);
      }
    });
    return Promise.resolve();
  }
}

class DummyDestination extends EtlDestination {
  setErrors = false;
  constructor(setErrors = false) {
    super();
    this.setErrors = setErrors;
  }
  public async store(batch: EtlBatch): Promise<void> {
    batch.setState(EtlState.SAVE_STARTED);
    if (this.setErrors) {
      batch.setState(EtlState.ERROR);
    } else {
      batch.setState(EtlState.SAVE_ENDED);
    }
    return Promise.resolve();
  }
}

class DummySavepointManager extends EtlSavepointManager {
  savepoint: string;
  constructor(savepoint: string) {
    super();
    this.savepoint = savepoint;
  }
  async getSavePoint(): Promise<string> {
    return Promise.resolve(this.savepoint);
  }
  async updateSavepoint(newSavepoint: string) {
    this.savepoint = newSavepoint;
    return Promise.resolve();
  }
}

class DummyEtlConfig extends EtlConfig {
}

suite('EtlRunner', () => {
  suite('Test dummy classes', () => {
    test('DummySavepointManager', async () => {
      const savePointManager = new DummySavepointManager('savepoint1');
      const savePoint = await savePointManager.getSavePoint();
      savePoint.must.be.equal('savepoint1');
      await savePointManager.updateSavepoint('New stored point');
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
    test('DummySource', async () => {
      const source = new DummySource();
      const savePointManager = new DummySavepointManager('savepoint1');
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('savepoint1');
      // first time true
      source.hasNextBatch().must.be.equal(true);
      // second time false
      source.hasNextBatch().must.be.equal(false);
      const batch = await source.getNextBatch();
      batch.getNumRecords().must.be.equal(1);
      source.stateChanged(EtlState.SAVE_ENDED);
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
    test('DummyTransformer', async () => {
      const trans = new DummyTransformer();
      const batch = new EtlBatch([{id: 1, name: 'part 1'}]);
      batch.getNumRecords().must.be.equal(1);
      await trans.transform(batch);
      batch.getNumRecordsWithState(EtlState.TRANSFORMED).must.be.equal(1);
      trans.setErrors = true;
      await trans.transform(batch);
      batch.getNumRecordsWithState(EtlState.ERROR).must.be.equal(1);
    });
    test('DummyDestination', async () => {
      const destination = new DummyDestination();
      const batch = new EtlBatch([{id: 1, name: 'part 1'}]);
      batch.getNumRecords().must.be.equal(1);
      await destination.store(batch);
      batch.getState().must.be.equal(EtlState.SAVE_ENDED);
      destination.setErrors = true;
      await destination.store(batch);
      batch.getState().must.be.equal(EtlState.ERROR);
    });
  });
  suite('Etl runner test', () => {
    // Set the config file for testing
    const config = new EtlConfig();
    config.setName('test etl');
    config.setMaxEtlSourceRetries(5);
    config.setEtlSourceTimeoutMillis(10);
    config.setEtlTransformerTimeoutMillis(10);
    config.setEtlDestinationTimeoutMillis(10);
    config.setEtlDestinationBatchSize(1);
    config.setMinSuccessfulTransformationPercentage(1);

    test('Source gets savepoint no batches', async () => {
      config.setEtlSource(new DummySource(0));
      config.setEtlTransformer(new DummyTransformer());
      config.setEtlDestination(new DummyDestination());
      const savePointManager = new DummySavepointManager('savepoint1');
      const etlRunner = new EtlRunner(config, savePointManager);
      await etlRunner.executeEtl();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('savepoint1');
    });
    test('One batch full process', async () => {
      config.setEtlSource(new DummySource(1));
      config.setEtlTransformer(new DummyTransformer());
      config.setEtlDestination(new DummyDestination());
      const savePointManager = new DummySavepointManager('savepoint1');
      const etlRunner = new EtlRunner(config, savePointManager);
      await etlRunner.executeEtl();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('New stored point');
    });
    test('One batch tranform error', async () => {
      config.setEtlSource(new DummySource(1));
      config.setEtlTransformer(new DummyTransformer(true));
      config.setEtlDestination(new DummyDestination());
      const savePointManager = new DummySavepointManager('savepoint1');
      const etlRunner = new EtlRunner(config, savePointManager);
      await etlRunner.executeEtl();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('savepoint1');
    });
    test('One batch save error', async () => {
      config.setEtlSource(new DummySource(1));
      config.setEtlTransformer(new DummyTransformer());
      config.setEtlDestination(new DummyDestination(true));
      const savePointManager = new DummySavepointManager('savepoint1');
      const etlRunner = new EtlRunner(config, savePointManager);
      await etlRunner.executeEtl();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal('savepoint1');
    });
  });
});
