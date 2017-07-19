import { EtlBatch } from './EtlBatch';


export abstract class EtlDestination {
  async abstract store(batch: EtlBatch);
}
