import { EtlBatch } from './EtlBatch';

export abstract class EtlTransformer {
  async abstract transform(batch: EtlBatch);
}
