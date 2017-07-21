import { EtlBatch } from './EtlBatch';

/**
 * Etl destination class. Stores the batch in the destination
 */
export abstract class EtlDestination {
  async abstract store(batch: EtlBatch);
}
