import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { CsvFile } from './CsvFile';
import { JsonFile } from './JsonFile';
import { Redshift } from './Redshift';
import { S3Bucket } from './S3Bucket';

export class DestinationPlugin implements Plugin {
    public etlName: string;
    public name = 'DestinationPlugin';
    private etlObjectName = 'EtlDestination';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    public getEtlObjectName() {
        return this.etlObjectName;
    }

    willStart(app: InceptumApp) {
        if (!app.hasConfig(`destinations`)) {
            throw new Error('DestinationPlugin has been registered but could not find config using key "destinations"');
        }
        const destinations = app.getConfig('destinations', {});
        Object.keys(destinations).forEach((destinationType) => {
            if (app.hasConfig(`destinations.${destinationType}.${this.etlName}`)) {
                this.registerDestinationSingleton(this.etlName, destinationType, destinations[destinationType][this.etlName], app.getContext());
            }
        });
    }

  protected registerDestinationSingleton(etlName: string, destinationType: string, destinationConfig: object, context: Context) {
      switch (destinationType) {
        case 'csvfile' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(CsvFile, this.getEtlObjectName());
            singletonDefinition.constructorParamByValue(destinationConfig['directory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            singletonDefinition.constructorParamByValue(destinationConfig['cleanUpDirectory']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'jsonfile':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(JsonFile, this.getEtlObjectName());
            singletonDefinition.constructorParamByValue(destinationConfig['directory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            singletonDefinition.constructorParamByValue(destinationConfig['cleanUpDirectory']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 's3bucket' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(S3Bucket, this.getEtlObjectName());
            singletonDefinition.constructorParamByValue(destinationConfig['fileType']);
            singletonDefinition.constructorParamByValue(destinationConfig['bucket']);
            singletonDefinition.constructorParamByValue(destinationConfig['tempDirectory']);
            singletonDefinition.constructorParamByValue(destinationConfig['fileName']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'redshift' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(Redshift, this.getEtlObjectName());
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
