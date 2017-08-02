import { Context, BaseSingletonDefinition } from 'inceptum';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';

export class TransformerConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`transformers`)) {
        return;
    }
    const transformers = context.getConfig('transformers');
    Object.keys(transformers).forEach((transformersType) => {
        if (context.hasConfig(`transformers.${transformersType}.${etlName}`)) {
            TransformerConfigManager.registerTransformerSingleton(etlName, transformersType, transformers[transformersType][etlName], context);
        }
    });
  }

  static registerTransformerSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
      switch (transformersType) {
        case 'simplecopy' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(SimpleCopy, 'EtlTransformer');
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'splitadwordscampaign':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(SplitAdwordsCampaign, 'EtlTransformer');
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            throw new Error(`Unknown trasformation type: ${transformersType}`);
    }
  }
}