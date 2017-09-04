import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';
import { GALandingPages } from './GALandingPages';
import { GATransactions } from './GATransactions';

export class TransformerPlugin implements Plugin {
    public etlName: string;
    public name = 'TransformerPlugin';
    private etlObjectName = 'EtlTransformer';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    public getEtlObjectName() {
        return this.etlObjectName;
    }

    willStart(app: InceptumApp) {
        if (!app.hasConfig(`transformers`)) {
            throw new Error('TransformerPlugin has been registered but could not find config using key "transformers"');
        }
        const transformers = app.getConfig('transformers', {});
        Object.keys(transformers).forEach((transformersType) => {
            if (app.hasConfig(`transformers.${transformersType}.${this.etlName}`)) {
                this.registerTransformerSingleton(this.etlName, transformersType, transformers[transformersType][this.etlName], app.getContext());
            }
        });
    }

    protected registerTransformerSingleton(etlName: string, transformersType: string, transformersConfig: object, context: Context) {
        switch (transformersType) {
            case 'simplecopy':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(SimpleCopy, this.getEtlObjectName());
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'splitadwordscampaign':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(SplitAdwordsCampaign, this.getEtlObjectName());
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'galandingpages':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(GALandingPages, this.getEtlObjectName());
                    singletonDefinition.constructorParamByRef(transformersConfig['dbClient']);
                    singletonDefinition.constructorParamByValue(transformersConfig['fieldsMapping']);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'gatransactions':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(GATransactions, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(transformersConfig['fieldsMapping']);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            default:
                throw new Error(`Unknown trasformation type: ${transformersType}`);
        }
    }
}
