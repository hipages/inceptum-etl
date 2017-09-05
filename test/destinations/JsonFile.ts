import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { JsonFile } from '../../src/destinations/JsonFile';

import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { EtlConfig } from '../../src/EtlConfig';
import { EtlRunner } from '../../src/EtlRunner';
import { EtlSavepointManager } from '../../src/EtlSavepointManager';
import { EtlSource } from '../../src/EtlSource';
import { EtlTransformer } from '../../src/EtlTransformer';
import { EtlDestination } from '../../src/EtlDestination';


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
    public async stateChanged(newState: EtlState): Promise<void> {
      if (newState === EtlState.SAVE_ENDED) {
        this.updateStoredSavePoint({value: 'New stored point'});
      }
      return Promise.resolve();
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
suite('JsonFile Destination', () => {
  suite('JsonFile test', () => {
    // init test data
    const etlBatch = [{
        transactionId: 'JOB3649837',
        campaign: 'TBD',
        source: 'google',
        adGroup: 'TBD',
        medium: 'TBD',
        keyword: 'TBD',
        landingPagePath: 'TBD',
        adMatchedQuery: '(not set)',
        deviceCategory: 'tablet',
        browser: 'Chrome',
        browserVersion: '59.0.3071.125',
        browserSize: '1100x1290',
    }];
    const directory = require('path').join(__dirname, '/tmp');
    const baseFileName = 'CsvFileTest';
    const cleanUpDirectory = false;
    const singleObjects = false;
    const thisFile = new JsonFile(directory, baseFileName, cleanUpDirectory);
    test('Create new instance of JsonFile', async () => {
      thisFile.must.be.an.instanceof(JsonFile);
    });
    test('Create store batch to JsonFile', async () => {
        const batch = new EtlBatch(etlBatch);
        thisFile.store(batch);
      });
  });
});
