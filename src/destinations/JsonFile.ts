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
  protected singleObjects: boolean;

  /**
   * Check that the destinations.csvfile.directory value in the config exist.
   * The destinations.csvfile.directory is use as base directory
   * The destinations.csvfile.fileName is use as default for the parameter {@link:baseFileName}
   * @param baseFileName the base file name to use to create the file name.
   * @param singleObjects save each record in the batch as JSON objects
   */
  constructor(baseFileName = '', singleObjects = false) {
    super('destinations.jsonfile', baseFileName);
    this.singleObjects = singleObjects;
  }

  /**
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<string> {
    if (this.canStore) {
        let data = '';
        if (this.singleObjects) {
          batch.getTransformedRecords().map((record) => {
              data += JSON.stringify(record.getTransformedData(), null, '\t');
          });
        } else {
          const list = [];
          batch.getTransformedRecords().map((record) => {
              list.push(record.getTransformedData());
          });
          data = JSON.stringify(list, null, '\t');
        }
        const fileFullName = `${this.baseFileName}${batch.getBatchNumber()}_${batch.getBatchIdentifier()}.json`;
        fs.writeFileSync(fileFullName, data);
        return fileFullName;
    } else {
        await batch.setState(EtlState.ERROR);
        // log error
        log.error(`Error saving batch as json: Batch:${batch.getBatchFullIdentifcation()}`);
      return '';
    }
  }
}
