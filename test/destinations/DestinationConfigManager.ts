import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { DestinationPlugin } from '../../src/destinations/DestinationPlugin';

const app = new InceptumApp();
const context = app.getContext();
const etlName = 'test_1';

// DestinationPlugin.registerSingletons(etlName, context);


suite('DestinationPlugin', () => {
  suite('Destination config test', () => {
    test('Basic ', async () => {
      // const config = await context.getObjectByName('EtlDestination');
    });
  });
});
