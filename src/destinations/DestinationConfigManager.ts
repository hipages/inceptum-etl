import { Context, InceptumApp } from 'inceptum';
import { EtlConfig } from '../EtlConfig';
import { CsvFile } from './CsvFile';
import { JsonFile } from './JsonFile';
import { Redshift } from './Redshift';
import { S3Bucket } from './S3Bucket';

export class DestinationConfigManager {
  static registerSingletons(etlConfig: EtlConfig, destinationType: string) {
    if (!etlConfig.hasConfig(`destinations.${destinationType}.default`) &&
        !etlConfig.hasConfig(`destinations.${destinationType}.${etlConfig.getName()}`)) {
      // No destination configured. Skipping
      return;
    }
    const confs = etlConfig.getConfig(`destinations.${destinationType}.${etlConfig.getName()}`, etlConfig.getConfig(`destinations.${destinationType}.default`));
    etlConfig.setEtlDestinationTimeoutMillis(confs['timeoutMillis']);
    etlConfig.setEtlDestinationBatchSize(confs['batchSize']);
    switch (destinationType) {
        case 'csvfile' :
            etlConfig.setEtlDestination(new CsvFile(confs['directory'], confs['fileName']));
            break;
        case 'jsonfile':
            etlConfig.setEtlDestination(new JsonFile(confs['directory'], confs['fileName']));
            break;
        case 's3bucket' :
            etlConfig.setEtlDestination(new S3Bucket(confs['fileType'], confs['bucket'], confs['tempDirectory'], confs['fileName']));
            break;
        case 'redshift' :
        //     etlConfig.setEtlDestination(new Redshift(myClient, etlConfig.getName(), confs['bucket'], confs['tempDirectory'],
        // confs['tableCopyName'], confs['tableName'], confs['bulkDeleteMatchFields']));
    }
  }
}
