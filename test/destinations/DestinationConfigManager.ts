import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { Context, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import { EtlDestination } from '../../src/EtlDestination';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { DestinationConfigManager } from '../../src/destinations/DestinationConfigManager';

class ExtendedDestination extends EtlDestination {
  setErrors = false;
  public async store(batch: EtlBatch): Promise<void> {
    batch.setState(EtlState.SAVE_STARTED);
    if (this.setErrors) {
      batch.setState(EtlState.ERROR);
    } else {
      batch.setState(EtlState.SAVE_ENDED);
    }
    return Promise.resolve();
  }
}

class ExtendedDestinationConfigManager extends DestinationConfigManager {
  static extendedRegisterSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedDestination, 'EtlDestination');
    singletonDefinition.constructorParamByValue(destinationConfig);
    context.registerSingletons(singletonDefinition);
  }
}

suite('DestinationConfigManager', () => {
  suite('Destination config test', () => {
    test('Basic ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      DestinationConfigManager.registerSingletons('test_1', context);
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('CsvFile');
    });
    test('Basic destination load with extended config ', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedDestinationConfigManager.registerSingletons('test_1', context);
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('CsvFile');
    });
    test('Extended destination load', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      ExtendedDestinationConfigManager.registerSingletons('test_7', context);
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('ExtendedDestination');
    });
    test('Basic not extended destination error', async () => {
      const app = new InceptumApp();
      const context = app.getContext();
      try {
        DestinationConfigManager.registerSingletons('test_7', context);
      } catch (err) {
        err.message.must.be.equal('Unknown destination type: extendeddestination');
      }
    });
  });
});
