import { Context, BaseSingletonDefinition } from 'inceptum';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';
import { GALandingPages } from './GALandingPages';
import { GATransactions } from './GATransactions';

export class TransformerConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`transformers`)) {
        return;
    }
    const transformers = context.getConfig('transformers');
    Object.keys(transformers).forEach((transformersType) => {
        if (context.hasConfig(`transformers.${transformersType}.${etlName}`)) {
            TransformerConfigManager.registerTransformerSingleton(etlName, transformersType, transformers[transformersType][etlName], context, this);
        }
    });
  }

  /**
   * Register the transformer in the context
   * @param etlName
   * @param transformersType
   * @param transformersConfig
   * @param context
   * @param self
   */
  static registerTransformerSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context, self: TransformerConfigManager) {
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
        case 'galandingpages':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(GALandingPages, 'EtlTransformer');
            singletonDefinition.constructorParamByRef(transformersConfig['dbClient']);
            singletonDefinition.constructorParamByValue(transformersConfig['fieldsMapping']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        case 'gatransactions':
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(GATransactions, 'EtlTransformer');
            singletonDefinition.constructorParamByValue(transformersConfig['fieldsMapping']);
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            self['extendedRegisterSingleton'](etlName, transformersType, transformersConfig, context);
    }
  }

  /**
   * Overload this function to extend the registration of transformers in the context
   * @param etlName
   * @param transformersType
   * @param transformersConfig
   * @param context
   */
  static extendedRegisterSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
    throw new Error(`Unknown trasformation type: ${transformersType}`);
  }
}
