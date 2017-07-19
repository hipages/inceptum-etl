import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlBatch } from '../src/EtlBatch';
import { EtlConfig } from '../src/EtlConfig';
import { EtlRunner } from '../src/EtlRunner';
import { EtlSavepointManager } from '../src/EtlSavepointManager';
import { EtlSavepointUpdater } from '../src/EtlSavepointUpdater';
import { EtlSource } from '../src/EtlSource';

class CapturingSource extends EtlSource {
  private savepoint: String;
  private savepointUpdater: EtlSavepointUpdater;

  public initSavePoint(savepoint: String, savepointUpdater: EtlSavepointUpdater) {
    this.savepoint = savepoint;
    this.savepointUpdater = savepointUpdater;
  }

  public getSavepoint(): String {
    return this.savepoint;
  }

  public getSavepointUpdater(): EtlSavepointUpdater {
    return this.savepointUpdater;
  }

  // tslint:disable-next-line:prefer-function-over-method
  public async getNextBatch(): Promise<EtlBatch> {
    return Promise.resolve(new EtlBatch([{id: 1, name: 'part 1'}]));
  }

  // tslint:disable-next-line:prefer-function-over-method
  hasNextBatch(): boolean {
    return false;
  }
}

class DummySavepointManager extends EtlSavepointManager {
  savepoint: String;
  constructor(savepoint: String) {
    super();
    this.savepoint = savepoint;
  }
  async getSavePoint(): Promise<String> {
    return Promise.resolve(this.savepoint);
  }
  async updateSavepoint(newSavepoint: String) {
    this.savepoint = newSavepoint;
    return Promise.resolve();
  }
}

suite('EtlRunner', () => {
  suite('Savepoint management', () => {
    test('Source gets savepoint', async () => {
      const config = new EtlConfig();
      const source = new CapturingSource();
      config.setEtlSource(source);
      const etlRunner = new EtlRunner(config, new DummySavepointManager('savepoint1'));
      await etlRunner.executeEtl();
      source.getSavepoint().must.be.equal('savepoint1');
    });
  });
});
