import { Context, BaseSingletonDefinition } from 'inceptum';
import { CsvFile } from './CsvFile';
import { JsonFile } from './JsonFile';
import { Redshift } from './Redshift';
import { S3Bucket } from './S3Bucket';

export class DestinationConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`destinations`)) {
        return;
    }
    const destinations = context.getConfig('destinations');
    Object.keys(destinations).forEach((destinationType) => {
        if (context.hasConfig(`destinations.${destinationType}.${etlName}`)) {
            DestinationConfigManager.registerDestinationSingleton(etlName, destinationType, destinations[destinationType][etlName], context, this);
        }
    });
  }

  /**
   * Register the destination in the context
   * @param etlName
   * @param destinationType
   * @param destinationConfig
   * @param context
   * @param self
   */
  static registerDestinationSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context, self: DestinationConfigManager) {
      switch (destinationType) {
        case 'csvfile' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(CsvFile, 'EtlDestination');
            singletonDefinition.constructorParamByValue(destinationConfig['directory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            singletonDefinition.constructorParamByValue(destinationConfig['cleanUpDirectory']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'jsonfile':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(JsonFile, 'EtlDestination');
            singletonDefinition.constructorParamByValue(destinationConfig['directory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            singletonDefinition.constructorParamByValue(destinationConfig['cleanUpDirectory']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 's3bucket' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(S3Bucket, 'EtlDestination');
            singletonDefinition.constructorParamByValue(destinationConfig['fileType']);
            singletonDefinition.constructorParamByValue(destinationConfig['bucket']);
            singletonDefinition.constructorParamByValue(destinationConfig['tempDirectory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'redshift' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(Redshift, 'EtlDestination');
            singletonDefinition.constructorParamByRef(destinationConfig['dbClient']);
            singletonDefinition.constructorParamByValue(etlName);
            singletonDefinition.constructorParamByValue(destinationConfig['bucket']);
            singletonDefinition.constructorParamByValue(destinationConfig['tempDirectory']);
            singletonDefinition.constructorParamByValue(destinationConfig['tableCopyName']);
            singletonDefinition.constructorParamByValue(destinationConfig['tableName']);
            singletonDefinition.constructorParamByValue(destinationConfig['bulkDeleteMatchFields']);
            singletonDefinition.constructorParamByValue(destinationConfig['iamRole']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            self['extendedRegisterSingleton'](etlName, destinationType, destinationConfig, context);
    }
  }

  /**
   * Overload this function to extend the registration of destination in the context
   *
   * @param etlName
   * @param destinationType
   * @param destinationConfig
   * @param context
   */
  static extendedRegisterSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context) {
    throw new Error(`Unknown destination type: ${destinationType}`);
  }
}
