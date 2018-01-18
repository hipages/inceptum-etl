import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { Context, BaseSingletonDefinition } from 'inceptum';
import { EtlDestination } from '../../src/EtlDestination';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { DestinationPlugin } from '../../src/destinations/DestinationPlugin';


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

class ExtendedDestinationPlugin extends DestinationPlugin {
  protected registerDestinationSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context) {
    switch (destinationType) {
      case 'extendeddestination':
        const singletonDefinition = new BaseSingletonDefinition<any>(ExtendedDestination, this.getEtlObjectName());
        singletonDefinition.constructorParamByValue(destinationConfig);
        context.registerSingletons(singletonDefinition);
        break;
      default:
        super.registerDestinationSingleton(etlName, destinationType, destinationConfig, context);
    }
  }
}

suite('DestinationPlugin', () => {
  suite('Destination plugin test', () => {
    test('Basic ', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new DestinationPlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('CsvFile');
      await app.stop();
    });
    test('Basic destination load with extended config ', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new ExtendedDestinationPlugin('test_1');
      app.use(pluginObj);
      await app.start();
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('CsvFile');
      await app.stop();
    });
    test('Extended destination load', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      const pluginObj = new ExtendedDestinationPlugin('test_7');
      app.use(pluginObj);
      await app.start();
      const destination = await context.getObjectByName('EtlDestination');
      const theType = destination.constructor.name;
      theType.must.be.equal('ExtendedDestination');
      await app.stop();
    });
    test('Basic not extended destination error', async () => {
      const app = new BaseApp();
      const context = app.getContext();
      try {
        const pluginObj = new DestinationPlugin('test_7');
        app.use(pluginObj);
        await app.start();
      } catch (err) {
        err.message.must.be.equal('Unknown destination type: extendeddestination');
      }
      await app.stop();
    });
  });
});
