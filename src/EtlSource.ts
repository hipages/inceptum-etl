import { EtlBatch, EtlStateListener, EtlState } from './EtlBatch';
import { EtlSavepointManager } from './EtlSavepointManager';
import { EtlBase } from './EtlBase';

/**
 * An EtlSource is an object of which the ETL will ask for batches
 * of data.
 * To start the framework will start calling its {@link #initSavePoint} method so it
 * can handles the save points, knows where it left off in past executions and when it
 * knows that a full process of batches are complited updates the save point to know
 * where to start again in the next execution after successfull finish or in case of
 * faulier of the following batches.
 * Implementations of EtlSource need not be thread-safe, meaning that there won't be
 * a call to getNextBatch or hasNextBatch but after it has given it's answer to
 * previous calls to those methods.
 */
export abstract class EtlSource extends EtlBase implements EtlStateListener {
  protected totalBatches = 0;
  protected initialSavePoint: object;
  protected currentSavePoint: object;
  protected etlSavepointManager: EtlSavepointManager;

  /**
   * Get the value stored in totalBatches
   */
  public getTotalBatches(): number {
    return this.totalBatches;
  }

  /**
   * Convert the savePoint object to string
   * @param savePoint Convers a save point object to string to be stored
   */
  protected abstract savePointToString(savePoint: object): string;

  /**
   * Convert a given string with save point format to a savePoint object format
   * @param savePoint Convers a sting to a save point object
   */
  protected abstract stringToSavePoint(savePoint: string): object;

  /**
   * This method can be overload to set the required to fetch the next batch
   */
  protected async initCurrentSavePoint() {
    this.currentSavePoint = {...this.initialSavePoint};
  }

  /**
   * Get the stored save point using the etlSavepointManager
   * @param savepointManager
   */
  public async initSavePoint(etlSavepointManager: EtlSavepointManager): Promise<void> {
    this.etlSavepointManager = etlSavepointManager;
    this.initialSavePoint = await this.getStoredSavePoint();
    await this.initCurrentSavePoint();
  }

  /**
   * Get the stored save point using the etlSavepointManager
   */
  protected async getStoredSavePoint(): Promise<object> {
    const savepoint = await this.etlSavepointManager.getSavePoint();
    return this.stringToSavePoint(savepoint);
  }

  /**
   * Update the save point in the database using the etlSavepointManager
   * @param newSavepoint
   */
  protected async updateStoredSavePoint(newSavepoint: object): Promise<void> {
    await this.etlSavepointManager.updateSavepoint(this.savePointToString(newSavepoint));
  }

  /**
   * Gets the initialSavepoint variable and returnts it converted to string
   */
  public getInitialSavepoint(): string {
    return this.savePointToString(this.initialSavePoint);
  }

  /**
   * Gets the currentSavePoint variable and returnts it converted to string
   */
  public getCurrentSavepoint(): string {
    return this.savePointToString(this.currentSavePoint);
  }

  /**
   * Gets the initialSavepoint variable
   */
  public getInitialSavepointObject(): object {
    return this.initialSavePoint;
  }

  /**
   * Gets the currentSavePoint variable
   */
  public getCurrentSavepointObject(): object {
    return this.currentSavePoint;
  }

  /**
   * Gets EtlSavepointManager used by this object
   */
  public getSavepointManager(): EtlSavepointManager {
    return this.etlSavepointManager;
  }

  /**
   * Get's the next batch of objects. It should add this object as listener to the batch
   * to know when it finished and make the relevant updates to the savePoint in
   * {@link #stateChanged}
   */
  async abstract getNextBatch(): Promise<EtlBatch>;

  /**
   * Whether there are more batches to be returned by the {@link #getNextBatch} method.
   */
  abstract hasNextBatch(): boolean;

  /**
   * Attach a listener to the final batch that marks a new save point
   * and if the state changes to EtlState.SAVE_ENDED set the new save point
   * and update it in the database with {@link #updateStoredSavePoint}
   * @param newState
   */
  abstract stateChanged(newState: EtlState): Promise<void>;
}
