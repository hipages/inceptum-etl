import * as fs from 'fs';
import { join as joinPath } from 'path';
import { dirname } from 'path';
import { toCSV as objectToCSV } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestinationFile } from '../EtlDestinationFile';

const log = LogManager.getLogger(__filename);

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
        // Replace spaces in the header row
        const csv = objectToCSV(list, { encoding : 'utf8', headers: 'key', wrap: '"' });
        // delimiter = <String> optional default value is ","
        // wrap  = <String|Boolean> optional default value is false
        // headers = <String> optional supported values are "full", "none", "relative", "key"
        // objectDenote = <String> optional default value is "."
        // arrayDenote = <String> optional default value is "[]"
        fs.writeFileSync(fileFullName, csv);
        return fileFullName;
    } else {
        await batch.setState(EtlState.ERROR);
        // log error
        log.error(`Error saving batch as csv: Batch:${batch.getBatchFullIdentifcation()}`);
        return '';
    }
  }
}
