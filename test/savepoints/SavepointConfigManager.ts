import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { SavepointConfigManager } from '../../src/savepoints/SavepointConfigManager';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

SavepointConfigManager.registerSingletons(etlName, context);

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic Getters and setters', async () => {
      const config = await context.getObjectByName('EtlSavepointManager');
    });
  });
});
