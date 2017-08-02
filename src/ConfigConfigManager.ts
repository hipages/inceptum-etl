import { Context, BaseSingletonDefinition } from 'inceptum';
import { EtlConfig } from './EtlConfig';

export class ConfigConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`etlOptions`)) {
        return;
    }
    if (context.hasConfig(`etlOptions.${etlName}`)) {
        const configurations = context.getConfig(`etlOptions.${etlName}`);
        ConfigConfigManager.registerConfigSingleton(etlName, configurations, context);
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
