import { promisifyAll } from 'bluebird';
import * as nodeAdwords from 'node-adwords';
import * as moment from 'moment';
import * as fs from 'fs';
import * as csvToObject from 'csvtojson';
import { LogManager } from 'inceptum';
import { EtlSource } from '../EtlSource';
import { EtlConfig } from '../EtlConfig';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlSavepointManager } from '../EtlSavepointManager';

promisifyAll(nodeAdwords);
const log = LogManager.getLogger();

export class AdwordsReportsFromCSV extends EtlSource {

  protected files: Array<string>;
  protected fileDir: string;
  protected fileName: string;
  protected header: string;
  protected headers: Array<string>;
  protected totalLine: number;
  protected configAdwords: object;
  protected errorFound = false;

  constructor(configAdwords: object) {
    super();
    this.files = [];
    this.fileName = '';
    this.fileDir = configAdwords['fileDir'];
    this.header = `"row","account","ad_type","ad_group_id","ad_group","ad_group_state","network","network_with_search_partners","city_location_of_interest","countryterritory_location_of_interest","metro_area_location_of_interest","most_specific_location_target_location_of_interest","region_location_of_interest","campaign_id","campaign_location_target","campaign","campaign_state","clicks","click_type","ad_id","keyword_id","keyword__placement","report_date","device","customer_id","google_click_id","match_type","city_physical_location","countryterritory_physical_location","metro_area_physical_location","most_specific_location_target_physical_location","region_physical_location","month_of_year","page","top_vs_other","user_list_id"`;
  }

  public getErrorFound(): boolean {
    return this.errorFound;
  }

  /**
   * Convert the savepoint object to a string for storage
   * @param savePoint
   */
  // tslint:disable-next-line:prefer-function-over-method
  protected savePointToString(savePoint: object) {
    return JSON.stringify(savePoint);
  }

  /**
   * Convert a given string to savepoint object. If it is an empry string
   * returns the default savepoint
   * @param savePoint
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
      fileName: this.fileName,
    };
  }

  /**
   * This method can be overriten to set the required data to fetch the next batch
   */
  protected async initCurrentSavePoint() {
    this.files = fs.readdirSync(this.fileDir).sort();
    this.headers = await this.loadHeader();
  }

  private loadHeader(): Promise<Array<string>> {
    return new Promise<Array<string>> ((resolve, reject) => {
      csvToObject({ noheader: true })
        .fromString(this.header)
        .on('csv', (csvRow) => {
          resolve(csvRow);
        });
    });
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
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  public async getNextBatch(): Promise<EtlBatch> {
    const fname = this.files.shift();
    this.fileName = `${this.fileDir}/${fname}`;
    const data = await this.loadFromCsvFile();

    const batch = new EtlBatch(data, 1, 1, fname);
    batch.registerStateListener(this);
    return batch;
  }

  //
  private async loadFromCsvFile(): Promise<Array<object>> {
    return new Promise<Array<object>> ((resolve, reject) => {
      const data: Array<object> = [];
      csvToObject({ noheader: true, headers: this.headers })
        .fromFile(this.fileName)
        .on('json', (jsonObj) => {
          data.push(jsonObj);
        })
        .on('done', (error) => {
          resolve(data);
        });
    });
  }

  public hasNextBatch(): boolean {
    return (this.files.length > 0);
  }

  public async stateChanged(newState: EtlState): Promise<void> {
    if (newState === EtlState.ERROR) {
      log.debug(`savepoint stored: ${this.getCurrentSavepoint()}`);
    }
  }
}
