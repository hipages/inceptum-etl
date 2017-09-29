import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { EtlConfig } from './EtlConfig';

export class ConfigPlugin implements Plugin {
  public etlName: string;
  public name = 'ConfigPlugin';
  private etlObjectName = 'EtlConfig';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  public getEtlObjectName() {
    return this.etlObjectName;
  }

  willStart(app: InceptumApp) {
    // Options in etls object:  etls = { etl_name: { source, transformer, destination, savepoint, config} }
    const configPath = `etls.${this.etlName}.config`;
    if (app.hasConfig(configPath) || app.hasConfig('generalConfig')) {
      const generalConfig = app.getConfig('generalConfig', null);
      const { ...options } = app.getConfig(configPath, generalConfig);
      app.getContext().getLogger().debug(`Registering configuration for ${this.etlName}`);
      this.registerConfigSingleton(this.etlName, options, app.getContext());
      return;
    }

    // Options in etlOptions object:  etlOptions = { etl_name, ... }
    if (!app.hasConfig(`etlOptions`)) {
      throw new Error('ConfigPlugin has been registered but could not find config using key "etlOptions"');
    }
    if (app.hasConfig(`etlOptions.${this.etlName}`)) {
      const configurations = app.getConfig(`etlOptions.${this.etlName}`, {});
      this.registerConfigSingleton(this.etlName, configurations, app.getContext());
    }
  }

  protected registerConfigSingleton(etlName: string, configurationConfig: object, context: Context) {
    const singletonDefinition = new BaseSingletonDefinition<any>(EtlConfig, this.getEtlObjectName());
    singletonDefinition.setPropertyByValue('name', etlName);
    singletonDefinition.setPropertyByRef('etlSource', 'EtlSource');
    singletonDefinition.setPropertyByRef('etlTransformer', 'EtlTransformer');
    singletonDefinition.setPropertyByRef('etlDestination', 'EtlDestination');
    singletonDefinition.setPropertyByRef('etlSavepointManager', 'EtlSavepointManager');
    singletonDefinition.setPropertyByValue('maxEtlSourceRetries', configurationConfig['source']['maxRetries']);
    singletonDefinition.setPropertyByValue('etlSourceTimeoutMillis', configurationConfig['source']['timeoutMillis']);
    if (configurationConfig.hasOwnProperty('transformer')) {
      singletonDefinition.setPropertyByValue('etlTransformerTimeoutMillis', configurationConfig['transformer']['timeoutMillis']);
      singletonDefinition.setPropertyByValue('minSuccessfulTransformationPercentage', configurationConfig['transformer']['minSuccessPercentage']);
    } else {
      singletonDefinition.setPropertyByValue('etlTransformerTimeoutMillis', configurationConfig['transformers']['timeoutMillis']);
      singletonDefinition.setPropertyByValue('minSuccessfulTransformationPercentage', configurationConfig['transformers']['minSuccessPercentage']);
    }
    if (configurationConfig.hasOwnProperty('destination')) {
      singletonDefinition.setPropertyByValue('maxEtlDestinationRetries', configurationConfig['destination']['maxRetries']);
      singletonDefinition.setPropertyByValue('etlDestinationTimeoutMillis', configurationConfig['destination']['timeoutMillis']);
      singletonDefinition.setPropertyByValue('etlDestinationBatchSize', configurationConfig['destination']['batchSize']);
    } else {
      singletonDefinition.setPropertyByValue('maxEtlDestinationRetries', configurationConfig['destinations']['maxRetries']);
      singletonDefinition.setPropertyByValue('etlDestinationTimeoutMillis', configurationConfig['destinations']['timeoutMillis']);
      singletonDefinition.setPropertyByValue('etlDestinationBatchSize', configurationConfig['destinations']['batchSize']);
    }
    context.registerSingletons(singletonDefinition);
  }
}
