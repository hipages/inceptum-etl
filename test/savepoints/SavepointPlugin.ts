import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { SavepointPlugin } from '../../src/savepoints/SavepointPlugin';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';

suite('SavepointPlugin', () => {
  const app = new InceptumApp();
  const context = app.getContext();
  const etlName = 'test_2';

  // SavepointPlugin.registerSingletons(etlName, context);
  const savepoints = new SavepointPlugin(etlName);
  app.use(savepoints);

  suite('Savepoint Plugin test', () => {
    test('Basic Getters and setters', async () => {
      await app.start();
      const config = await context.getObjectByName('EtlSavepointManager');
      config.must.be.instanceof(StaticSavepointManager);
    });
  });
});

