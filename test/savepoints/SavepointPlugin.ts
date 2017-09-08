import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlSavepointManager } from '../../src/EtlSavepointManager';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { SavepointPlugin } from '../../src/savepoints/SavepointPlugin';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';

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

class ExtendedSavepointPlugin extends SavepointPlugin {
  protected registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    switch (savepointType) {
      case 'extendedsavepoint' :
      {
          const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedSavepoint, this.getEtlObjectName());
          singletonDefinition.constructorParamByValue(savepointConfig);
          context.registerSingletons(singletonDefinition);
      }
          break;
      default:
          super.registerSavepointSingleton(etlName, savepointType, savepointConfig, context);
    }
  }
}

suite('Savepoint Plugin test', () => {
  test('Basic ', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    const savepoints = new SavepointPlugin('test_2');
    app.use(savepoints);
    await app.start();
    const savepoint = await context.getObjectByName('EtlSavepointManager');
    savepoint.must.be.instanceof(StaticSavepointManager);
  });
  test('Basic savepoint load with extended config ', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    const savepoints = new ExtendedSavepointPlugin('test_2');
    app.use(savepoints);
    await app.start();
    const savepoint = await context.getObjectByName('EtlSavepointManager');
    savepoint.must.be.instanceof(StaticSavepointManager);
  });
  test('Extended savepoint load', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    const savepoints = new ExtendedSavepointPlugin('test_7');
    app.use(savepoints);
    await app.start();
    const savepoint = await context.getObjectByName('EtlSavepointManager');
    savepoint.must.be.instanceof(ExtendedSavepoint);
  });
  test('Basic not extended savepoint error', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    try {
      const savepoints = new SavepointPlugin('test_7');
      app.use(savepoints);
      await app.start();
      const savepoint = await context.getObjectByName('EtlSavepointManager');
    } catch (err) {
      err.message.must.be.equal('Unknown savepoint type: extendedsavepoint');
    }
  });
});
