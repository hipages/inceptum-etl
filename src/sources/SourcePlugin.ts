import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsReports } from './AdwordsReports';
import { GoogleAnalyticsJobs } from './GoogleAnalyticsJobs';
import { GoogleAnalyticsPages } from './GoogleAnalyticsPages';
import { GaLandingPagesHistoricaldata } from './GaLandingPagesHistoricaldata';
import { AdwordsReportsHistoricalData } from './AdwordsReportsHistoricalData';

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
        if (!app.hasConfig(`sources`)) {
            throw new Error('SourcePlugin has been registered but could not find config using key "sources"');
        }
        const sources = app.getConfig('sources', {});
        Object.keys(sources).forEach((sourceType) => {
            if (app.hasConfig(`sources.${sourceType}.${this.etlName}`)) {
                this.registerSourceSingleton(this.etlName, sourceType, sources[sourceType][this.etlName], app.getContext());
            }
        });
    }

    protected registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
        switch (sourceType) {
            case 'gaLandingPagesHistoricaldata' :
            {
                const singletonDefinition = new BaseSingletonDefinition<any>(GaLandingPagesHistoricaldata, 'EtlSource');
                singletonDefinition.constructorParamByRef(sourceConfig['dbClient']);
                singletonDefinition.constructorParamByValue(sourceConfig['sourceOptions']);
                context.registerSingletons(singletonDefinition);
            }
                break;
            case 'gaDataPartnersHistoricaldata' :
            {
                const singletonDefinition = new BaseSingletonDefinition<any>(GaLandingPagesHistoricaldata, 'EtlSource');
                singletonDefinition.constructorParamByRef(sourceConfig['dbClient']);
                singletonDefinition.constructorParamByValue(sourceConfig['sourceOptions']);
                context.registerSingletons(singletonDefinition);
            }
                break;
            case 'adwordsreports' :
            {
                const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReports, this.getEtlObjectName());
                singletonDefinition.constructorParamByValue(sourceConfig);
                context.registerSingletons(singletonDefinition);
            }
                break;
            case 'adwordsreportshistoricaldata' :
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
            default:
                throw new Error(`Unknown source type: ${sourceType}`);
            }
    }
}
