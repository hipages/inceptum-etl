import * as moment from 'moment';
import * as fs from 'fs';
import * as os from 'os';
import * as lineByLine from 'n-readlines';
import * as csvToObject from 'csvtojson';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlConfig } from '../EtlConfig';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlSavepointManager } from '../EtlSavepointManager';

const log = LogManager.getLogger(__filename);

export interface ReadCsvFileConfig {
  fileName: string,
  fileHasHeader: boolean,
  headers: string[],
}

export class ReadCsvFile extends EtlSource {

  protected fileName: string;
  protected fileHasHeader: boolean;
  protected headers: string[];
  protected fileReader: any;
  protected lastLine: any;
  protected errorFound = false;
  protected defaultBlockSize = 1000;
  protected fileFormat = 'utf8';
  protected currentLineNumber = 0;

  constructor(config: Partial<ReadCsvFileConfig>) {
    super();
    this.fileName = config.fileName || '';
    this.fileHasHeader = config.hasOwnProperty('fileHasHeader') ? config.fileHasHeader : true;
    this.headers = this.fileHasHeader ? [] : config.headers || [];
  }

  /**
   * Get fileName private variable
   */
  public getFileName(): string {
    return this.fileName;
  }

  /**
   * Get fileHasHeader private variable
   */
  public getFileHasHeader(): boolean {
    return this.fileHasHeader;
  }

  /**
   * Get fileName private variable
   */
  public getHeaders(): string[] {
    return this.headers;
  }

  /**
   * Get errorFound private variable
   */
  public getErrorFound(): boolean {
    return this.errorFound;
  }

  /**
   * Convert the savepoint object to a string for storage
   * @param {object} savePoint
   */
  // tslint:disable-next-line:prefer-function-over-method
  protected savePointToString(savePoint: object) {
    return JSON.stringify(savePoint);
  }

  /**
   * Convert a given string to savepoint object. If it is an empty string
   * returns the default savepoint
   * @param {string} savePoint
   */
  protected stringToSavePoint(savePoint: string) {
    if (savePoint.length === 0) {
      return this.defaultSavePoint();
    }
    return JSON.parse(savePoint);
  }

  /**
   * Get the default savepoint.
   */
  // tslint:disable-next-line:prefer-function-over-method
  public defaultSavePoint(): object {
    return {
      blockSize: this.defaultBlockSize,
      line: 0,
      batchNumber: 0,
    };
  }

  /**
   * Get the stored save point using the etlSavepointManager
   * @param savepointManager
   */
  public async initSavePoint(etlSavepointManager: EtlSavepointManager): Promise<void> {
    this.etlSavepointManager = etlSavepointManager;
    this.initialSavePoint = await this.getStoredSavePoint();
    await this.initCurrentSavePoint();
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected async initCurrentSavePoint() {
    if (!fs.statSync(this.fileName).isFile()) {
      log.fatal(`File does not exist ${this.fileName}`);
      throw new Error(`File does not exist ${this.fileName}`);
    }
    this.fileReader = new lineByLine(this.fileName);
    if (this.fileHasHeader) {
      const line = this.fileReader.next();
      this.headers = line ? await this.loadHeader(line.toString(this.fileFormat)) : [];
    }
    this.currentSavePoint = {
      blockSize: Number(this.initialSavePoint['blockSize']) || this.defaultBlockSize,
      line: Number(this.initialSavePoint['line']) || 0,
      batchNumber: Number(this.initialSavePoint['batchNumber']) || 0,
    };
    // Keep the last line read to know if has next batch
    this.lastLine = this.fileReader.next();
    if (this.lastLine) {
      this.currentLineNumber = 1;
    }
  }

  /**
   * Convert header from csv to array
   * @param {string} header
   */
  // tslint:disable-next-line:prefer-function-over-method
  public async loadHeader(header: string): Promise<string[]> {
    return new Promise<Array<string>> ((resolve, reject) => {
      csvToObject({ noheader: true })
        .fromString(header)
        .on('csv', (csvRow) => {
          resolve(csvRow);
        });
    });
  }

  /**
   * check if the last line read was the end of file
   */
  public hasNextBatch(): boolean {
    return (this.lastLine) ? true : false;
  }

  public getCurrentBatchIdentifier(): string {
    return this.currentSavePoint['batchNumber'].toString();
  }

  /**
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  public async getNextBatch(): Promise<EtlBatch> {
    let data = [];
    if (this.hasNextBatch()) {
      data = await this.loadFromCsvFile();
    }
    const batch = new EtlBatch(data, this.currentSavePoint['batchNumber'], 0, this.getCurrentBatchIdentifier());
    batch.registerStateListener(this);
    return batch;
  }

  public async fromCsvToObject(csv: string): Promise<any> {
    return new Promise<Array<object>> ((resolve, reject) => {
      const data: Array<object> = [];
      csvToObject({ noheader: true, headers: this.headers })
        .fromString(csv)
        .on('json', (jsonObj) => {
          data.push(jsonObj);
        })
        .on('done', (error) => {
          resolve(data);
        });
    });
  }

  private async loadFromCsvFile(): Promise<Array<object>> {
    let csv = '';
    const toLine = Number(this.currentSavePoint['line']) + Number(this.currentSavePoint['blockSize']);
    while (this.lastLine && (this.currentLineNumber <= toLine)) {
      if (this.currentLineNumber > this.currentSavePoint['line']) {
        const eol = ((csv.length > 0) ? os.EOL : '');
        csv = `${csv}${eol}${this.lastLine.toString(this.fileFormat)}`;
      }
      this.lastLine = this.fileReader.next();
      this.currentLineNumber++;
    }
    this.currentSavePoint['line'] = (toLine > this.currentLineNumber) ? this.currentLineNumber : toLine;
    this.currentSavePoint['batchNumber']++;
    return await this.fromCsvToObject(csv);
  }

  /**
   * Update variables and savepoint when the batch state changes
   * @param {EtlState} newState
   */
  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
      this.errorFound = true;
    }
    if (!this.errorFound && (newState === EtlState.SAVE_ENDED)) {
      // if this is the last block reset the savepoint
      if (!this.hasNextBatch()) {
        this.currentSavePoint['line'] = 0;
        this.currentSavePoint['batchNumber'] = 0;
      }
      await this.updateStoredSavePoint(this.currentSavePoint);
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }
}
