import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { TransformerConfigManager } from '../../src/transformers/TransformerConfigManager';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

TransformerConfigManager.registerSingletons(etlName, context);

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic Getters and setters', async () => {
      const config = await context.getObjectByName('EtlTransformer');
    });
  });
});
