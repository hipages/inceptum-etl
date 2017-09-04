import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlTransformer } from '../../src/EtlTransformer';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { TransformerPlugin } from '../../src/transformers/TransformerPlugin';

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


class ExtendedTransformerPlugin extends TransformerPlugin {
  protected registerTransformerSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
    switch (transformersType) {
      case 'extendedtransformer':
        const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedTransformer, 'EtlTransformer');
        singletonDefinition.constructorParamByValue(transformersType);
        context.registerSingletons(singletonDefinition);
        break;
      default:
        super.registerTransformerSingleton(etlName, transformersType, transformersConfig, context);
    }
  }
}

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      const pluginObj = new TransformerPlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const transformer = await context.getObjectByName('EtlTransformer');
      const theType = transformer.constructor.name;
      theType.must.be.equal('SplitAdwordsCampaign');
    });
    test('Basic transformer load with extended config ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      const pluginObj = new ExtendedTransformerPlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const transformer = await context.getObjectByName('EtlTransformer');
      const theType = transformer.constructor.name;
      theType.must.be.equal('SplitAdwordsCampaign');
    });
    test('Extended transformer load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      const pluginObj = new ExtendedTransformerPlugin('test_7');
      app.use(pluginObj);
      await app.start();
      const transformer = await context.getObjectByName('EtlTransformer');
      const theType = transformer.constructor.name;
      theType.must.be.equal('ExtendedTransformer');
    });
    test('Basic not extended transformer error', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      try {
        const pluginObj = new TransformerPlugin('test_7');
        app.use(pluginObj);
        await app.start();
      } catch (err) {
        err.message.must.be.equal('Unknown trasformation type: extendedtransformer');
      }
    });
  });
});
