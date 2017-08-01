import * as fs from 'fs';
import { join as joinPath } from 'path';
import { dirname } from 'path';
import { LogManager } from 'inceptum';
import { EtlConfig } from './EtlConfig';
import { EtlDestination } from './EtlDestination';

const log = LogManager.getLogger();

export abstract class EtlDestinationFile extends EtlDestination {
  protected baseFileName: string;
  protected canStore = true;

  /**
   * Check that the destinations.csvfile.directory value in the config exist.
   * The destinations.csvfile.directory is use as base directory
   * The destinations.csvfile.fileName is use as default for the parameter {@link:baseFileName}
   * @param configVar the configuration name to load
   * @param baseFileName the base file name to use to create the file name.
   */
  constructor(configVar: string, baseFileName = '') {
    super();
    const configFile = EtlConfig.getConfig(configVar);
    if (configFile.directory.lenght === 0) {
        configFile.directory = joinPath(__dirname, 'files');
    }
    baseFileName = baseFileName.trim().length > 0 ? baseFileName.trim() : configFile.fileName;
    this.baseFileName = joinPath(configFile.directory, baseFileName);
    const baseDirectory = dirname(this.baseFileName);
    if (!fs.existsSync(baseDirectory)) {
        fs.mkdirSync(baseDirectory);
        log.error(`Error saving batch directory does not exist:${baseDirectory}`);
    }
    this.canStore = fs.existsSync(baseDirectory);
  }

  /**
   * Utility to delete all files from directory
   */
  public cleanUpDirectory() {
    const directory = dirname(this.baseFileName);
    const fileList = fs.readdirSync(directory);
    fileList.map( (file) => {
        fs.unlinkSync(joinPath(directory, file));
    });
  }

  /**
   * Get the baseFileName variable
   */
  public getBaseFileName(): string {
      return this.baseFileName;
  }
}
