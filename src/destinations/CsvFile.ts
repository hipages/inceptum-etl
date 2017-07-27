import * as fs from 'fs';
import { join as joinPath } from 'path';
import { toCSV as objectToCSV } from 'csvjson';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestination } from '../EtlDestination';

export class CsvFile extends EtlDestination {
  protected fileName: string;
  protected canStore = true;

  /**
   * Check that the directory set in the config exist and
   * set the directory name
   */
  constructor() {
    super();
    const configFile = EtlConfig.getConfig('destinations.file');
    if (configFile.directory.lenght === 0) {
        configFile.directory = __dirname;
    }
    this.fileName = joinPath(configFile.directory, configFile.fileName);
    this.canStore = fs.existsSync(configFile.directory);
  }

  /**
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<void> {
    batch.setState(EtlState.SAVE_STARTED);
    if (this.canStore) {
        const list = [];
        batch.getTransformedRecords().map((record) => {
            list.push(record.getTransformedData());
        });
        fs.writeFileSync(`${this.fileName}_${batch.getBatchNumber()}.csv`, objectToCSV(list));
        batch.setState(EtlState.SAVE_ENDED);
    } else {
      batch.setState(EtlState.ERROR);
    }
    return Promise.resolve();
  }
}
