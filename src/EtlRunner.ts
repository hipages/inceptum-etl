import { EtlBatch, EtlState } from './EtlBatch';
import { EtlConfig } from './EtlConfig';
import { EtlSavepointManager } from './EtlSavepointManager';

/**
 * The class that runs the etl
 */
export class EtlRunner {
  private config: EtlConfig;
  private etlSavepointManager: EtlSavepointManager;

  /**
   * Constructor: gets the configuration in EtlConfig and the save point manager
   * EtlSavepointManager.
   * @param config
   * @param etlSavepointManager
   */
  constructor(config: EtlConfig, etlSavepointManager: EtlSavepointManager) {
    this.config = config;
    this.etlSavepointManager = etlSavepointManager;
  }

  /**
   * Executes the etl
   */
  public async executeEtl(): Promise<void> {
    const source = this.config.getEtlSource();
    await source.initSavePoint(this.etlSavepointManager);
    while (source.hasNextBatch()) {
      const batch: EtlBatch = await source.getNextBatch();
      batch.setEtlName(this.config.getName());
      await this.transformBatch(batch);
      if (batch.getState() !== EtlState.ERROR) {
        await this.storeBatch(batch);
      }
    }
  }

  /**
   * transformBatch uses the EtlTransformer object to transform the given batch
   * If the transformer can't process the batch or the successPercentage of records is
   * not reached the batch state is set to EtlState.ERROR
   * If the batch is successfully transformed the batch state is set to
   * EtlState.TRANSFORM_ENDED
   * @param batch
   */
  protected async transformBatch(batch: EtlBatch): Promise<void> {
    batch.setState(EtlState.TRANSFORM_STARTED);
    const transformer = this.config.getEtlTransformer();
    await transformer.transform(batch);
    if (batch.getState() === EtlState.ERROR) {
      return;
    }
    const numErrorRecords = batch.getNumRecordsWithState(EtlState.ERROR);
    const numRecords = batch.getNumRecords();
    const successPercentage = (numRecords - numErrorRecords) / numRecords;
    if (successPercentage < this.config.getMinSuccessfulTransformationPercentage()) {
      batch.setState(EtlState.ERROR);
    } else {
      batch.setState(EtlState.TRANSFORM_ENDED);
    }
  }

  /**
   * storeBatch: stores the batch in the config Destination and sets the batch state
   * to EtlState.ERROR if fails or EtlState.SAVE_ENDED on success
   * @param batch
   */
  protected async storeBatch(batch: EtlBatch): Promise<void> {
    batch.setState(EtlState.SAVE_STARTED);
    const destination = this.config.getEtlDestination();
    await destination.store(batch);
    if (batch.getState() !== EtlState.ERROR) {
      batch.setState(EtlState.SAVE_ENDED);
    }
  }
}
