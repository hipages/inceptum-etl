import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { SavepointConfigManager } from '../src/savepoints/SavepointConfigManager';
import { DestinationConfigManager } from '../src/destinations/DestinationConfigManager';
import { TransformerConfigManager } from '../src/transformers/TransformerConfigManager';
import { SourceConfigManager } from '../src/sources/SourceConfigManager';
import { RunnerConfigManager } from '../src/RunnerConfigManager';
import { ConfigConfigManager } from '../src/ConfigConfigManager';

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
RunnerConfigManager.registerSingletons(etlName, context);

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic Getters and setters', async () => {
      const config = await context.getObjectByName('EtlRunner');
    });
  });
});
