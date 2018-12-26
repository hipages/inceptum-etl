import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from './EtlBatch';
import { EtlConfig } from './EtlConfig';
import { EtlSavepointManager } from './EtlSavepointManager';

const log = LogManager.getLogger();

/**
 * The class that runs the etl
 */
export class EtlRunner {
  private config: EtlConfig;

  /**
   * Constructor: gets the configuration in EtlConfig and the save point manager
   * EtlSavepointManager.
   * @param config
   */
  constructor(config: EtlConfig) {
    this.config = config;
  }

  /**
   * Executes the etl
   */
  public async executeEtl(): Promise<void> {
    const source = this.config.getEtlSource();
    const etlSavepointManager = this.config.getEtlSavepointManager();
    try {
      await source.initSavePoint(etlSavepointManager);
      while (source.hasNextBatch()) {
        const batch: EtlBatch = await source.getNextBatch();
        batch.setEtlName(this.config.getName());
        await this.transformBatch(batch);
        if (batch.getState() !== EtlState.ERROR) {
          await this.storeBatch(batch);
        } else {
          // Log the error
          log.error(`Error transforming the batch:${batch.getBatchFullIdentifcation()}`);
        }
      }
    } catch (err) {
      log.fatal(`Error caught in EtlRunner:${err.message}`);
      throw(err);
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
    await batch.setState(EtlState.TRANSFORM_STARTED);
    const transformer = this.config.getEtlTransformer();
    await transformer.transform(batch);
    if (batch.getState() === EtlState.ERROR) {
      return;
    }
    const numErrorRecords = batch.getNumRecordsWithState(EtlState.ERROR);
    const numRecords = batch.getNumRecords();
    const successPercentage = (numRecords - numErrorRecords) / numRecords;
    if (successPercentage < this.config.getMinSuccessfulTransformationPercentage()) {
      await batch.setState(EtlState.ERROR);
    } else {
      await batch.setState(EtlState.TRANSFORM_ENDED);
    }
  }

  /**
   * storeBatch: stores the batch in the config Destination and sets the batch state
   * to EtlState.ERROR if fails or EtlState.SAVE_ENDED on success
   * @param batch
   */
  protected async storeBatch(batch: EtlBatch): Promise<void> {
    await batch.setState(EtlState.SAVE_STARTED);
    const destination = this.config.getEtlDestination();
    /**
     * If the batch is not empty store it
     * otherwise just touch it
     */
    const records = batch.getNumRecordsWithState(EtlState.TRANSFORMED);
    if (records) {
      await destination.store(batch);
    } else {
      await destination.touch(batch);
    }
    if (batch.getState() !== EtlState.ERROR) {
      await batch.setState(EtlState.SAVE_ENDED);
    } else {
      // Log the error
      log.error(`Error saving batch:${batch.getBatchFullIdentifcation()}`);
    }
  }
}
