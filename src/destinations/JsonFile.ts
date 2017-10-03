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
   * @param directory the directory to save the files
   * @param baseFileName the base file name to use to create the file name.
   * @param cleanUpDirectory remove existing files in directory
   * @param singleObjects save each record in the batch as JSON objects
   */
  constructor(directory: string, baseFileName: string, cleanUpDirectory = false, singleObjects = false) {
    super(directory, baseFileName, cleanUpDirectory);
    this.singleObjects = singleObjects;
  }

  /**
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<string> {
    if (this.canStore) {
        const fileFullName = `${this.baseFileName}${batch.getBatchNumber()}_${batch.getBatchIdentifier()}.json`;
        if (this.singleObjects) {
          // Initialize the file
          fs.writeFileSync(fileFullName, '');
          batch.getTransformedRecords().map((record) => {
              fs.writeFileSync(fileFullName, JSON.stringify(record.getTransformedData(), null, '\t'), {flag: 'a'});
          });
        } else {
          const list = [];
          batch.getTransformedRecords().map((record) => {
              list.push(record.getTransformedData());
          });
          fs.writeFileSync(fileFullName, JSON.stringify(list, null, '\t'));
        }
        return fileFullName;
    } else {
        await batch.setState(EtlState.ERROR);
        // log error
        log.error(`Error saving batch as json: Batch:${batch.getBatchFullIdentifcation()}`);
      return '';
    }
  }
}
