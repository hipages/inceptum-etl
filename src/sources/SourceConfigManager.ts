import { Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsReports } from './AdwordsReports';
import { GoogleAnalyticsJobs } from './GoogleAnalyticsJobs';
import { GoogleAnalyticsPages } from './GoogleAnalyticsPages';
import { GaLandingPagesHistoricaldata } from './GaLandingPagesHistoricaldata';


export class SourceConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`sources`)) {
        return;
    }
    const sources = context.getConfig('sources');
    Object.keys(sources).forEach((sourceType) => {
        if (context.hasConfig(`sources.${sourceType}.${etlName}`)) {
            SourceConfigManager.registerSourceSingleton(etlName, sourceType, sources[sourceType][etlName], context);
        }
    });
  }

  static registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
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
            const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsReports, 'EtlSource');
            singletonDefinition.constructorParamByValue(sourceConfig);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'googleanalyticsjobs':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(GoogleAnalyticsJobs, 'EtlSource');
            singletonDefinition.constructorParamByValue(sourceConfig);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'googleanalyticspages':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(GoogleAnalyticsPages, 'EtlSource');
            singletonDefinition.constructorParamByValue(sourceConfig);
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            throw new Error(`Unknown source type: ${sourceType}`);
    }
  }
}
