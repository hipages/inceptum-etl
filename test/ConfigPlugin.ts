import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { BaseSingletonDefinition } from 'inceptum';
import { ConfigPlugin } from '../src/ConfigPlugin';

class EmptyClass {
    public value: boolean;
    constructor(value = true) {
        this.value = value;
    }
}

const app = new BaseApp();
const context = app.getContext();
const etlName = 'test_1';

context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlSavepointManager'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlDestination'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlTransformer'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlSource'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlRunner'));
const confPlugin = new ConfigPlugin(etlName);
app.use(confPlugin);

suite('Config Plugin', () => {
  suite('ConfigPlugin test', () => {
    test('Basic Getters and setters', async () => {
      await app.start();
      const config = await context.getObjectByName('EtlConfig');
      config.getName().must.be.equal('test_1');
      config.getMaxEtlSourceRetries().must.be.equal(3);
      config.getEtlSourceTimeoutMillis().must.be.equal(5000);
      config.getEtlTransformerTimeoutMillis().must.be.equal(5000);
      config.getMinSuccessfulTransformationPercentage().must.be.equal(1);
      config.getEtlDestinationTimeoutMillis().must.be.equal(5000);
      config.getEtlDestinationBatchSize().must.be.equal(1);
      config.getMaxEtlDestinationRetries().must.be.equal(3);
      const obj = new EmptyClass();
      config.getEtlSource().must.be.eql(obj);
      config.getEtlDestination().must.be.eql(obj);
      config.getEtlTransformer().must.be.eql(obj);
      config.getEtlSavepointManager().must.be.eql(obj);
      await app.stop();
    });
  });
});
