
export enum EtlRecordState {
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
  private state = EtlRecordState.CREATED;
  /**
   * An identifier for the record
   */
  private id: String;
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
}

export class EtlBatch {

}
