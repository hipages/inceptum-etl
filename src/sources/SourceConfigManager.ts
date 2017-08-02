import { EtlConfig } from '../EtlConfig';
import { AdwordsClicks } from './AdwordsClicks';
import { AdwordsKeywords } from './AdwordsKeywords';

export class SourceConfigManager {
  static registerSingletons(etlConfig: EtlConfig, sourceType: string) {
    if (!etlConfig.hasConfig(`sources.${sourceType}.default`) &&
        !etlConfig.hasConfig(`sources.${sourceType}.${etlConfig.getName()}`)) {
      // No source configured. Skipping
      return;
    }
    const confs = etlConfig.getConfig(`sources.${sourceType}.${etlConfig.getName()}`, etlConfig.getConfig(`sources.${sourceType}.default`));
    etlConfig.setMaxEtlSourceRetries(confs['maxRetries']);
    etlConfig.setEtlSourceTimeoutMillis(confs['timeoutMillis']);
    switch (sourceType) {
        case 'adwordsClicks' :
            etlConfig.setEtlSource(new AdwordsClicks(confs));
            break;
        case 'adwordsKeywords':
            etlConfig.setEtlSource(new AdwordsKeywords(confs));
    }
  }
}
