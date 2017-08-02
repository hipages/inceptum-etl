import { EtlConfig } from './EtlConfig';
import { MySQLEtlSavepointManager } from './EtlSavepointManager';

export class SavepointConfigManager {
  static registerSingletons(etlConfig: EtlConfig, sourceType: string) {
    if (!etlConfig.hasConfig(`${sourceType}.savePoint`)) {
      // No source configured. Skipping
      return;
    }
    const confs = etlConfig.getConfig(`${sourceType}.savePoint`);
    switch (sourceType) {
        case 'mysql' :
            // etlConfig.setEtlSavepointManager(new MySQLEtlSavepointManager(DBClient));
    }
  }
}
