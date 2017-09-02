import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { EtlConfig } from './EtlConfig';

export class ConfigPlugin implements Plugin  {
  etlName: string;
  name: 'ConfigPlugin';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  getName() {
    return this.name;
  }

  willStart(app: InceptumApp) {
    const context = app.getContext();
    if (!context.hasConfig(`etlOptions`)) {
        return;
    }
    if (context.hasConfig(`etlOptions.${this.etlName}`)) {
        const configurations = context.getConfig(`etlOptions.${this.etlName}`);
        ConfigPlugin.registerConfigSingleton(this.etlName, configurations, context);
    }
  }

  static registerConfigSingleton(etlName: string, configurationConfig: object, context: Context) {
        const singletonDefinition = new BaseSingletonDefinition<any>(EtlConfig, 'EtlConfig');
        singletonDefinition.setPropertyByValue('name', etlName);
        singletonDefinition.setPropertyByRef('etlSource', 'EtlSource');
        singletonDefinition.setPropertyByRef('etlTransformer', 'EtlTransformer');
        singletonDefinition.setPropertyByRef('etlDestination', 'EtlDestination');
        singletonDefinition.setPropertyByRef('etlSavepointManager', 'EtlSavepointManager');
        singletonDefinition.setPropertyByValue('maxEtlSourceRetries', configurationConfig['source']['maxRetries']);
        singletonDefinition.setPropertyByValue('etlSourceTimeoutMillis', configurationConfig['source']['timeoutMillis']);
        singletonDefinition.setPropertyByValue('etlTransformerTimeoutMillis', configurationConfig['transformers']['timeoutMillis']);
        singletonDefinition.setPropertyByValue('minSuccessfulTransformationPercentage', configurationConfig['transformers']['minSuccessPercentage']);
        singletonDefinition.setPropertyByValue('maxEtlDestinationRetries', configurationConfig['destinations']['maxRetries']);
        singletonDefinition.setPropertyByValue('etlDestinationTimeoutMillis', configurationConfig['destinations']['timeoutMillis']);
        singletonDefinition.setPropertyByValue('etlDestinationBatchSize', configurationConfig['destinations']['batchSize']);
        context.registerSingletons(singletonDefinition);
  }
}
