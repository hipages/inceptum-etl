import { Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsReports } from './AdwordsReports';
import { GoogleAnalyticsJobs } from './GoogleAnalyticsJobs';
import { GoogleAnalyticsPages } from './GoogleAnalyticsPages';


export class SourceConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`sources`)) {
        return;
    }
    const sources = context.getConfig('sources');
    Object.keys(sources).forEach((sourceType) => {
        if (context.hasConfig(`sources.${sourceType}.${etlName}`)) {
            SourceConfigManager.registerSourceSingleton(etlName, sourceType, sources[sourceType][etlName], context, this);
        }
    });
  }

  /**
   * Register the source in the context
   * @param etlName
   * @param sourceType
   * @param sourceConfig
   * @param context
   * @param self
   */
  static registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context, self: SourceConfigManager) {
      switch (sourceType) {
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
            self['extendedRegisterSingleton'](etlName, sourceType, sourceConfig, context);
    }
  }

  /**
   * Overload this function to extend the registration of sources in the context
   *
   * @param etlName
   * @param sourceType
   * @param sourceConfig
   * @param context
   */
  static extendedRegisterSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }

}
