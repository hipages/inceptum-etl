import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { CsvFile } from './CsvFile';
import { JsonFile } from './JsonFile';
import { Redshift } from './Redshift';
import { S3Bucket } from './S3Bucket';

export class DestinationPlugin implements Plugin {
    etlName: string;
    name: 'DestinationPlugin';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    getName() {
        return this.name;
    }

    willStart(app: InceptumApp) {
        const context = app.getContext();
        if (!context.hasConfig(`destinations`)) {
            return;
        }
        const destinations = context.getConfig('destinations');
        Object.keys(destinations).forEach((destinationType) => {
            if (context.hasConfig(`destinations.${destinationType}.${this.etlName}`)) {
                DestinationPlugin.registerDestinationSingleton(this.etlName, destinationType, destinations[destinationType][this.etlName], context);
            }
        });
    }

  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`destinations`)) {
        return;
    }
    const destinations = context.getConfig('destinations');
    Object.keys(destinations).forEach((destinationType) => {
        if (context.hasConfig(`destinations.${destinationType}.${etlName}`)) {
            DestinationPlugin.registerDestinationSingleton(etlName, destinationType, destinations[destinationType][etlName], context);
        }
    });
  }

  static registerDestinationSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context) {
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
            throw new Error(`Unknown destination type: ${destinationType}`);
    }
  }
}
