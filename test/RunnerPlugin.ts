import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { BaseSingletonDefinition } from 'inceptum';
import { SavepointPlugin } from '../src/savepoints/SavepointPlugin';
import { DestinationPlugin } from '../src/destinations/DestinationPlugin';
import { TransformerPlugin } from '../src/transformers/TransformerPlugin';
import { SourcePlugin } from '../src/sources/SourcePlugin';
import { RunnerPlugin } from '../src/RunnerPlugin';
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
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlConfig'));
const pluginObj = new RunnerPlugin(etlName);
app.use(pluginObj);

suite('Runner plugin', () => {
  suite('RunnerPlugin test', () => {
    test('Basic Getters and setters', async () => {
      await app.start();
      const runner = await context.getObjectByName('EtlRunner');
      const theType = runner.constructor.name;
      theType.must.be.equal('EtlRunner');
      await app.stop();
    });
  });
});
