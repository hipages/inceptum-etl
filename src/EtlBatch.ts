
export enum EtlState {
  CREATED,
  TRANSFORM_STARTED,
  TRANSFORM_ENDED,
  SAVE_STARTED,
  SAVE_ENDED,
  ERROR,
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

  constructor(data: Object) {
    this.data = data;
  }
  getState(): EtlState {
    return this.state;
  }
  setState(state: EtlState) {
    this.state = state;
  }
}

export interface EtlStateListener {
  stateChanged(newState: EtlState),
}

export class EtlBatch {

  private state = EtlState.CREATED;
  private etlName: String;
  private records: Array<EtlBatchRecord>;
  private listeners: Array<EtlStateListener>;

  constructor(sourceObjects: Array<Object>) {
    this.records = [];
    this.listeners = [];
    this.addSourceRecords(sourceObjects);
  }
  setEtlName(etlName: String) {
    this.etlName = etlName;
  }
  addSourceRecord(sourceObject: Object) {
    this.records.push(new EtlBatchRecord(sourceObject));
  }
  addSourceRecords(sourceObjects: Array<Object>) {
    sourceObjects.forEach((sourceObject) => this.addSourceRecord(sourceObject));
  }
  setState(state: EtlState) {
    this.state = state;
    this.listeners.forEach((listener) => listener.stateChanged(state));
  }
  registerStateListener(listener: EtlStateListener) {
    this.listeners.push(listener);
  }
  getState(): EtlState {
    return this.state;
  }
  getRecords(): Array<EtlBatchRecord> {
    return this.records;
  }
}
