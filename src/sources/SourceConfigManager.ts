import { Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsClicks } from './AdwordsClicks';
import { AdwordsKeywords } from './AdwordsKeywords';

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
        case 'adwordsclicks' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsClicks, 'EtlSource');
            singletonDefinition.constructorParamByValue(sourceConfig);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'adwordskeywords':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(AdwordsKeywords, 'EtlSource');
            singletonDefinition.constructorParamByValue(sourceConfig);
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            throw new Error(`Unknown source type: ${sourceType}`);
    }
  }
}
