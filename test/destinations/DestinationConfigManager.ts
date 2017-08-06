import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { DestinationConfigManager } from '../../src/destinations/DestinationConfigManager';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

DestinationConfigManager.registerSingletons(etlName, context);

suite('DestinationConfigManager', () => {
  suite('Destination config test', () => {
    test('Basic ', async () => {
      // const config = await context.getObjectByName('EtlDestination');
    });
  });
});
