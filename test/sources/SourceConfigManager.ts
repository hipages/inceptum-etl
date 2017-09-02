import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { SourcePlugin } from '../../src/sources/SourcePlugin';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

// SourcePlugin.registerSingletons(etlName, context);

suite('SourcePlugin', () => {
  suite('Source config test', () => {
    test('Basic', async () => {
      const config = await context.getObjectByName('EtlSource');
    });
  });
});
