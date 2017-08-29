import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlSource } from '../../src/EtlSource';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { SourceConfigManager } from '../../src/sources/SourceConfigManager';

class ExtendedSource extends EtlSource {
  batches = 1;

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

class ExtendedSourceConfigManager extends SourceConfigManager {
  static extendedRegisterSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedSource, 'EtlSource');
    singletonDefinition.constructorParamByValue(sourceConfig);
    context.registerSingletons(singletonDefinition);
  }
}

suite('SourceConfigManager', () => {
  suite('Source config test', () => {
    test('Basic source load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      SourceConfigManager.registerSingletons('test_1', context);
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('AdwordsClicks');
    });
    test('Basic source load with extended config ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedSourceConfigManager.registerSingletons('test_1', context);
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('AdwordsClicks');
    });
    test('Extended source load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedSourceConfigManager.registerSingletons('test_7', context);
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('ExtendedSource');
    });
    test('Basic not extended source error', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      try {
        SourceConfigManager.registerSingletons('test_7', context);
      } catch (err) {
        err.message.must.be.equal('Unknown source type: extendedsource');
      }
    });
  });
});
