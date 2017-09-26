import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';
import { SmartFieldMapping } from './SmartFieldMapping';
import { FieldsMapping } from './FieldsMapping';

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
            case 'smartfieldmapping' :
            {
                const singletonDefinition = new BaseSingletonDefinition<any>(SmartFieldMapping, 'EtlTransformer');
                singletonDefinition.constructorParamByValue(etlName);
                singletonDefinition.constructorParamByValue(transformersConfig['tempDirectory']);
                singletonDefinition.constructorParamByValue(transformersConfig['regexPath']);
                singletonDefinition.constructorParamByValue(transformersConfig['bucket']);
                singletonDefinition.constructorParamByValue(transformersConfig['fieldsMapping']);
                context.registerSingletons(singletonDefinition);
            }
                break;
            case 'simplecopy':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(SimpleCopy, this.getEtlObjectName());
                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'splitadwordscampaign':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(SplitAdwordsCampaign, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(transformersConfig['fixedFields']);
                    singletonDefinition.constructorParamByValue(transformersConfig['fieldsRequiringMapping']);                    context.registerSingletons(singletonDefinition);
                }
                break;
            case 'fieldsmapping':
                {
                    const singletonDefinition = new BaseSingletonDefinition<any>(FieldsMapping, this.getEtlObjectName());
                    singletonDefinition.constructorParamByValue(transformersConfig['fixedFields']);
                    singletonDefinition.constructorParamByValue(transformersConfig['mappedFields']);
                    context.registerSingletons(singletonDefinition);
                }
                break;
            default:
                throw new Error(`Unknown trasformation type: ${transformersType}`);
        }
    }
}
