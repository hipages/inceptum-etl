import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { Context, BaseSingletonDefinition } from 'inceptum';
import { EtlSource } from '../../src/EtlSource';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { SourcePlugin } from '../../src/sources/SourcePlugin';

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

class ExtendedSourcePlugin extends SourcePlugin {
  protected registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedSource, 'EtlSource');
    switch (sourceType) {
      case 'extendedsource':
        singletonDefinition.constructorParamByValue(sourceConfig);
        context.registerSingletons(singletonDefinition);
        break;
      default:
        super.registerSourceSingleton(etlName, sourceType, sourceConfig, context);
    }
  }
}

suite('SourcePlugin', () => {
  suite('Source config test', () => {
    test('Basic source load', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new SourcePlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('AdwordsReports');
      await app.stop();
    });
    test('Basic source load with extended config ', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new ExtendedSourcePlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('AdwordsReports');
      await app.stop();
    });
    test('Extended source load', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new ExtendedSourcePlugin('test_7');
      app.use(pluginObj);
      await app.start();
      const source = await context.getObjectByName('EtlSource');
      const theType = source.constructor.name;
      theType.must.be.equal('ExtendedSource');
      await app.stop();
    });
    test('Basic not extended source error', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      try {
        const pluginObj = new SourcePlugin('test_7');
        app.use(pluginObj);
        await app.start();
      } catch (err) {
        err.message.must.be.equal('Unknown source type: extendedsource');
      }
      await app.stop();
    });
  });
});
