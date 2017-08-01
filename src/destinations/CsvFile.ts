import * as fs from 'fs';
import { join as joinPath } from 'path';
import { dirname } from 'path';
import { toCSV as objectToCSV } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestinationFile } from '../EtlDestinationFile';

const log = LogManager.getLogger();

export class CsvFile extends EtlDestinationFile {
  protected baseFileName: string;
  protected canStore = true;

  /**
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<string> {
    if (this.canStore) {
        const list = [];
        batch.getTransformedRecords().map((record) => {
            list.push(record.getTransformedData());
        });
        const fileFullName = `${this.baseFileName}${batch.getBatchNumber()}_${batch.getBatchIdentifier()}.csv`;
        fs.writeFileSync(fileFullName, objectToCSV(list));
        return fileFullName;
    } else {
        await batch.setState(EtlState.ERROR);
        // log error
        log.error(`Error saving batch as csv: Batch:${batch.getBatchFullIdentifcation()}`);
        return '';
    }
  }
}
