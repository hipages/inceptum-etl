import * as fs from 'fs';
import { join as joinPath } from 'path';
import { dirname } from 'path';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestinationFile } from '../EtlDestinationFile';

const log = LogManager.getLogger();

export class JsonFile extends EtlDestinationFile {
  protected baseFileName: string;
  protected canStore = true;

  /**
   * Check that the directory value in the config exist and
   * set the directory name in the {@link:thisfileName} variable
   */
  constructor(baseFileName = '') {
    super('destinations.jsonfile', baseFileName);
  }

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
        const fileFullName = `${this.baseFileName}${batch.getBatchNumber()}_${batch.getBatchIdentifier()}.json`;
        fs.writeFileSync(fileFullName, JSON.stringify(list, null, '\t'));
        return fileFullName;
    } else {
        await batch.setState(EtlState.ERROR);
        // log error
        log.error(`Error saving batch as json: Batch:${batch.getBatchFullIdentifcation()}`);
      return '';
    }
  }
}
