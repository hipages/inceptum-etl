import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { AdwordsClicks } from './AdwordsClicks';
import { AdwordsKeywords } from './AdwordsKeywords';
import { GoogleAnalyticsJobs } from './GoogleAnalyticsJobs';
import { GoogleAnalyticsPages } from './GoogleAnalyticsPages';


export class SourcePlugin implements Plugin {
    etlName: string;
    name: 'SourcePlugin';

    constructor(etlName: string) {
        this.etlName = etlName;
    }

    getName() {
        return this.name;
    }

    willStart(app: InceptumApp) {
        const context = app.getContext();
        if (!context.hasConfig(`sources`)) {
            return;
        }
        const sources = context.getConfig('sources');
        Object.keys(sources).forEach((sourceType) => {
            if (context.hasConfig(`sources.${sourceType}.${this.etlName}`)) {
                SourcePlugin.registerSourceSingleton(this.etlName, sourceType, sources[sourceType][this.etlName], context);
            }
        });
    }

    static registerSourceSingleton(etlName: string, sourceType: string, sourceConfig: object, context: Context) {
        switch (sourceType) {
            case 'adwordsclicks':
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
