import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
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

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlSavepointManager'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlDestination'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlTransformer'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlSource'));
context.registerSingletons(new BaseSingletonDefinition<any>(EmptyClass, 'EtlConfig'));
RunnerPlugin.willStart(app);

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic Getters and setters', async () => {
      const config = await context.getObjectByName('EtlRunner');
    });
  });
});
