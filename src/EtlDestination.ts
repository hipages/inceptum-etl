import { LogManager } from 'inceptum';
import { EtlBatch } from './EtlBatch';
const log = LogManager.getLogger(__filename);
/**
 * Etl destination class. Stores the batch in the destination
 */
export abstract class EtlDestination {
  async abstract store(batch: EtlBatch);

  /**
   * Touch the batch
   * Overwrite this method with if you need to do anything on an empty batch
   */
  public async touch(batch: EtlBatch): Promise<void> {
    log.error(`Process empty batch ${batch.getBatchIdentifier()}`);
    return;
  }
}
