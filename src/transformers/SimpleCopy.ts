import { EtlBatch } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';

export class SimpleCopy extends EtlTransformer {
  /**
   * Copy batch records to transform data
   * @param batch
   */
  // tslint:disable-next-line:prefer-function-over-method
  public async transform(batch: EtlBatch): Promise<void> {
    batch.getRecords().map( (record) => (record.setTransformedData(record.getData())) );
  }
}
