import { EtlConfig } from '../EtlConfig';
import { SimpleCopy } from './SimpleCopy';
import { SplitAdwordsCampaign } from './SplitAdwordsCampaign';

export class TransformerConfigManager {
  static registerSingletons(etlConfig: EtlConfig, sourceType: string) {
    if (!etlConfig.hasConfig(`transformers.${sourceType}.default`) &&
        !etlConfig.hasConfig(`transformers.${sourceType}.${etlConfig.getName()}`)) {
      // No source configured. Skipping
      return;
    }
    const confs = etlConfig.getConfig(`transformers.${sourceType}.${etlConfig.getName()}`, etlConfig.getConfig(`transformers.${sourceType}.default`));
    etlConfig.setEtlTransformerTimeoutMillis(confs['timeoutMillis']);
    etlConfig.setMinSuccessfulTransformationPercentage(confs['minSuccessPercentage']);
    switch (sourceType) {
        case 'simpleCopy' :
            etlConfig.setEtlTransformer(new SimpleCopy());
            break;
        case 'splitAdwordsCampaign':
            etlConfig.setEtlTransformer(new SplitAdwordsCampaign());
    }
  }
}
