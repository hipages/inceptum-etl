import { EtlBatch } from './EtlBatch';

export abstract class EtlTransformer {
  public async abstract transform(batch: EtlBatch): Promise<void>;
}
