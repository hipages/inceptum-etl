import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlSavepointManager } from '../../src/EtlSavepointManager';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { SavepointConfigManager } from '../../src/savepoints/SavepointConfigManager';

class ExtendedSavepoint extends EtlSavepointManager {
  savepoint: string;
  async getSavePoint(): Promise<string> {
    return Promise.resolve(this.savepoint);
  }
  async updateSavepoint(newSavepoint: string) {
    this.savepoint = newSavepoint;
    return Promise.resolve();
  }
}

class ExtendedSavepointConfigManager extends SavepointConfigManager {
  static extendedRegisterSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedSavepoint, 'EtlSavepointManager');
    singletonDefinition.constructorParamByValue(savepointConfig);
    context.registerSingletons(singletonDefinition);
  }
}

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      SavepointConfigManager.registerSingletons('test_2', context);
      const savepoint = await context.getObjectByName('EtlSavepointManager');
      const theType = savepoint.constructor.name;
      theType.must.be.equal('StaticSavepointManager');
    });
    test('Basic savepoint load with extended config ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedSavepointConfigManager.registerSingletons('test_2', context);
      const savepoint = await context.getObjectByName('EtlSavepointManager');
      const theType = savepoint.constructor.name;
      theType.must.be.equal('StaticSavepointManager');
    });
    test('Extended savepoint load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedSavepointConfigManager.registerSingletons('test_7', context);
      const savepoint = await context.getObjectByName('EtlSavepointManager');
      const theType = savepoint.constructor.name;
      theType.must.be.equal('ExtendedSavepoint');
    });
    test('Basic not extended savepoint error', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      try {
        SavepointConfigManager.registerSingletons('test_7', context);
      } catch (err) {
        err.message.must.be.equal('Unknown savepoint type: extendedsavepoint');
      }
    });
  });
});
