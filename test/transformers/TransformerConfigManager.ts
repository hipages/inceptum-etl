import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlTransformer } from '../../src/EtlTransformer';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { TransformerConfigManager } from '../../src/transformers/TransformerConfigManager';

class ExtendedTransformer extends EtlTransformer {
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


class ExtendedTransformerConfigManager extends TransformerConfigManager {
  static extendedRegisterSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedTransformer, 'EtlTransformer');
    singletonDefinition.constructorParamByValue(transformersType);
    context.registerSingletons(singletonDefinition);
  }
}

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      TransformerConfigManager.registerSingletons('test_1', context);
      const config = await context.getObjectByName('EtlTransformer');
    });
    test('Basic transformer load with extended config ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedTransformerConfigManager.registerSingletons('test_1', context);
      const transformer = await context.getObjectByName('EtlTransformer');
      const theType = transformer.constructor.name;
      theType.must.be.equal('SplitAdwordsCampaign');
    });
    test('Extended transformer load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedTransformerConfigManager.registerSingletons('test_7', context);
      const transformer = await context.getObjectByName('EtlTransformer');
      const theType = transformer.constructor.name;
      theType.must.be.equal('ExtendedTransformer');
    });
    test('Basic not extended transformer error', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      try {
        TransformerConfigManager.registerSingletons('test_7', context);
      } catch (err) {
        err.message.must.be.equal('Unknown trasformation type: extendedtransformer');
      }
    });
  });
});
