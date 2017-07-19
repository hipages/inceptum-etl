import { EtlBatch } from './EtlBatch';
import { EtlSavepointUpdater } from './EtlSavepointUpdater';


/**
 * An EtlSource is a stateful object of which the ETL will ask for batches
 * of data.
 * To start the framework will start calling its {@link #initSavePoint} method so it
 * knows where it left off in past executions.
 * Implementations of EtlSource need not be thread-safe, meaning that there won't be a call to getNextBatch or
 * hasNextBatch but after it has given it's answer to previous calls to those methods.
 */
export abstract class EtlSource {
  /**
   * Method gets called with the last savepoint the source has communicated to the framework
   * @param savepoint {string} The last savepoint that this source had notified the framework
   * @param savepointUpdater {EtlSavepointUpdater} A utility class the source can use to
   * let the framework know that the savepoint should be updated.
   */
  abstract initSavePoint(savepoint: String, savepointUpdater: EtlSavepointUpdater);

  /**
   * Get's the next batch of objects.
   * <p>
   * It's important to notice
   */
  async abstract getNextBatch(): Promise<EtlBatch>;

  /**
   * Whether there are more batches to be returned by the {@link #getNextBatch} method.
   */
  abstract hasNextBatch(): boolean;
}
