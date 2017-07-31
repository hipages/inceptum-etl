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
   * Check that the directory value in the config exist and
   * set the directory name in the {@link:thisfileName} variable
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
