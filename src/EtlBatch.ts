
export enum EtlState {
  CREATED,
  TRANSFORM_STARTED,
  TRANSFORM_ENDED,
  SAVE_STARTED,
  SAVE_ENDED,
  ERROR,
  TRANSFORMED,
}

/**
 * Each of the individual records in the batch
 */
export class EtlBatchRecord {
  /**
   * The status of this record
   */
  private state = EtlState.CREATED;
  /**
   * The data of the record as a JSON object
   */
  private data: Object;
  /**
   * The data after it's been transformed
   */
  private transformedData: Object;
  /**
   * In case there's been an error, we should capture the exception in this field
   */
  private error: Error;

  /**
   * Constructor stores the data in this object
   * @param data JSON object
   */
  constructor(data: Object) {
    this.data = data;
  }

  /**
   * Get the state of the object
   */
  public getState(): EtlState {
    return this.state;
  }

  /**
   * Set the state for this object with the passed state
   * @param state EtlState
   */
  public setState(state: EtlState) {
    this.state = state;
  }

  /**
   * Get the data
   */
  public getData(): Object {
    return this.data;
  }

  /**
   * Get the transformedData
   */
  public getTransformedData(): Object {
    return this.transformedData;
  }

  /**
   * Get the transformedData
   */
  public setTransformedData(data: Object) {
    this.transformedData = data;
    this.setState(EtlState.TRANSFORMED);
  }

  /**
   * Get the error
   */
  public getError(): Error {
    return this.error;
  }
}

export interface EtlStateListener {
  stateChanged(newState: EtlState),
}

/**
 * The batch
 */
export class EtlBatch {

  private state = EtlState.CREATED;
  private stateTimeInMs = Date.now();
  private etlName: String;
  private records: Array<EtlBatchRecord>;
  private listeners: Array<EtlStateListener>;
  private batchNumber: number;
  private totalBatches: number;

  /**
   * Constructor: stores the sourceObjects into the batch with the default state
   * @param sourceObjects Array of JSON objects
   */
  constructor(sourceObjects: Array<Object>, batchNumber= 1, totalBatches= 1) {
    this.records = [];
    this.listeners = [];
    this.batchNumber = batchNumber;
    this.totalBatches = totalBatches;
    this.addSourceRecords(sourceObjects);
  }

  /**
   * Add the source objcets as EtlBatchRecord in the batch
   * @param sourceObjects
   */
  public addSourceRecords(sourceObjects: Array<Object>) {
    sourceObjects.forEach((sourceObject) => this.addSourceRecord(sourceObject));
  }

  /**
   * Add a single source record into the batch array
   * @param sourceObject
   */
  public addSourceRecord(sourceObject: Object) {
    this.records.push(new EtlBatchRecord(sourceObject));
  }

  /**
   * Set the etl name
   * @param etlName string
   */
  public setEtlName(etlName: String) {
    this.etlName = etlName;
  }

  /**
   * Gel the etl name
   * @param etlName string
   */
  public getEtlName(): String {
    return this.etlName;
  }

  /**
   * Set the state of the batch and Call the listeners' stateChanged method
   * @param state
   */
  public setState(state: EtlState) {
    this.state = state;
    this.stateTimeInMs = Date.now();
    this.listeners.forEach((listener) => listener.stateChanged(state));
  }

  /**
   * Get the batch state
   */
  public getState(): EtlState {
    return this.state;
  }

  /**
   * Get the time the batch has been in this state in milliseconds
   */
  public getInStateTimeInMs(): number {
    return Date.now() - this.stateTimeInMs;
  }

  /**
   * Get the batchNumber
   */
  public getBatchNumber(): number {
    return this.batchNumber;
  }

  /**
   * Get the number total of Batches expected
   */
  public getTotalBatches(): number {
    return this.totalBatches;
  }

  /**
   * Register the listener in the list
   * @param listener
   */
  public registerStateListener(listener: EtlStateListener) {
    this.listeners.push(listener);
  }

  /**
   * Get all the records of the batch
   */
  public getRecords(): Array<EtlBatchRecord> {
    return this.records;
  }

  /**
   * Get the number of records
   */
  public getNumRecords(): number {
    return this.records.length;
  }

  /**
   * Get the number of record with a state equal to the parameter
   * @param state the required state
   */
  public getNumRecordsWithState(state: EtlState): number {
    return this.records.filter((r) => (r.getState() === state)).length;
  }

  /**
   * Gell all the records whit state EtlState.TRANSFORMED
   */
  public getTransformedRecords(): Array<object> {
    return this.records.filter((r) => (r.getState() === EtlState.TRANSFORMED));
  }
}
