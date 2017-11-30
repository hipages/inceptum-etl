import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsReports } from './AdwordsReports';
import { AdwordsReportsFromCSV } from './AdwordsReportsFromCSV';
import { GoogleAnalyticsJobs } from './GoogleAnalyticsJobs';
import { GoogleAnalyticsPages } from './GoogleAnalyticsPages';
import { MySQLDataByKey } from './MySQLDataByKey';
import { AdwordsReportsHistoricalData } from './AdwordsReportsHistoricalData';
import { ReadCsvFile } from './ReadCsvFile';
import { AdwordsReportLargeFile } from './AdwordsReportLargeFile';


export class SourcePlugin implements Plugin {
    public etlName: string;
    public name = 'SourcePlugin';
    private etlObjectName = 'EtlSource';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    public getEtlObjectName() {
        return this.etlObjectName;
    }

    willStart(app: InceptumApp) {
        // Source in etls object: etls = { etl_name: { source, transformer, destination, savepoint, config} }
        const configPath = `etls.${this.etlName}.source`;
        if (app.hasConfig(configPath)) {
            const { type, ...options } = app.getConfig(configPath, null);
            app.getContext().getLogger().debug(`Registering ${type} source for ${this.etlName}`);
            this.registerSourceSingleton(this.etlName, type, options, app.getContext());
            return;
        }

        if (!app.hasConfig(`sources`)) {
            throw new Error('SourcePlugin has been registered but could not find config using key "sources"');
        }
        const sources = app.getConfig('sources', {});

        // Source in generalConfig object:  generalConfig = { source, transformer, destination, savepoint }
        // sources = { type, ... }
        if (app.hasConfig(`generalConfig.source.type`)) {
            const type = app.getConfig('etlOptions.source.type', '');
            if (app.hasConfig(`sources.${type}`)) {
            app.getContext().getLogger().debug(`Registering ${type} source for ${this.etlName}`);
            this.registerSourceSingleton(this.etlName, type, sources[type], app.getContext());
            return;
            }
        }

        // Etl in sources object:  sources = { etl_name, ... }
          Object.keys(sources).forEach((sourceType) => {
            if (app.hasConfig(`sources.${sourceType}.${this.etlName}`)) {
                this.registerSourceSingleton(this.etlName, sourceType, sources[sourceType][this.etlName], app.getContext());
            }
        });
    }

    protected registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
        switch (sourceType) {
            case 'mysqldatabykey':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(MySQLDataByKey, 'EtlSource');
                    singletonDefinition.constructorParamByRef(sourceConfig['dbClient']);
                    singletonDefinition.constructorParamByValue(sourceConfig['sourceOptions']);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'adwordsreports':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReports, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'adwordsreportsfromcsv':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReportsFromCSV, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'adwordsreportshistoricaldata':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReportsHistoricalData, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'googleanalyticsjobs':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(GoogleAnalyticsJobs, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'googleanalyticspages':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(GoogleAnalyticsPages, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'readcsvfile':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(ReadCsvFile, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'adwordsreportlargefile':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReportLargeFile, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(sourceConfig);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            default:
                throw new Error(`Unknown source type: ${sourceType}`);
        }
    }
}
