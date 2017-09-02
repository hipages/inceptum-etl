import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';
import { GALandingPages } from './GALandingPages';
import { GATransactions } from './GATransactions';

export class TransformerPlugin implements Plugin {
    etlName: string;
    name: 'TransformerPlugin';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    getName() {
        return this.name;
    }

    willStart(app: InceptumApp) {
        const context = app.getContext();
        if (!context.hasConfig(`transformers`)) {
            return;
        }
        const transformers = context.getConfig('transformers');
        Object.keys(transformers).forEach((transformersType) => {
            if (context.hasConfig(`transformers.${transformersType}.${this.etlName}`)) {
                TransformerPlugin.registerTransformerSingleton(this.etlName, transformersType, transformers[transformersType][this.etlName], context);
            }
        });
    }

    static registerTransformerSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
        switch (transformersType) {
            case 'simplecopy':
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
                throw new Error(`Unknown trasformation type: ${transformersType}`);
        }
    }
}
