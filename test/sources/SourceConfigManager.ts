import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { SourceConfigManager } from '../../src/sources/SourceConfigManager';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

SourceConfigManager.registerSingletons(etlName, context);

suite('SourceConfigManager', () => {
  suite('Source config test', () => {
    test('Basic', async () => {
      const config = await context.getObjectByName('EtlSource');
    });
  });
});
