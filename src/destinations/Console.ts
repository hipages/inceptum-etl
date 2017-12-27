import { EtlBatch } from '../EtlBatch';
import { EtlDestination } from '../EtlDestination';

/**
 * Should be use for dev only
 */
export class Console extends EtlDestination {
  // tslint:disable-next-line:prefer-function-over-method
  public store(batch: EtlBatch) {
    // tslint:disable-next-line:no-console
    console.log(JSON.stringify(batch));
  }
}
