import { EtlBatch, EtlState } from './EtlBatch';
import { EtlConfig } from './EtlConfig';
import { EtlSavepointManager } from './EtlSavepointManager';
import { EtlSavepointUpdater } from './EtlSavepointUpdater';


export class EtlRunner implements EtlSavepointUpdater {
  private config: EtlConfig;
  private etlSavepointManager: EtlSavepointManager;

  constructor(config: EtlConfig, etlSavepointManager: EtlSavepointManager) {
    this.config = config;
    this.etlSavepointManager = etlSavepointManager;
  }

  public async executeEtl() {
    const source = this.config.getEtlSource();
    const savepoint = await this.etlSavepointManager.getSavePoint();
    const self = this;
    source.initSavePoint(savepoint, this);
    while (source.hasNextBatch()) {
      const batch: EtlBatch = await source.getNextBatch();
      batch.setEtlName(this.config.getName());
      await this.transformBatch(batch);
      if (batch.getState() !== EtlState.ERROR) {
        await this.storeBatch(batch);
      }
    }
  }

  async updateSavepoint(newSavepoint: string) {
    this.etlSavepointManager.updateSavepoint(newSavepoint);
  }

  async transformBatch(batch: EtlBatch) {
    batch.setState(EtlState.TRANSFORM_STARTED);
    const transformer = this.config.getEtlTransformer();
    await transformer.transform(batch);
    if (batch.getState() === EtlState.ERROR) {
      return;
    }
    const numErrorRecords = batch.getRecords().filter((r) => (r.getState() === EtlState.ERROR)).length;
    const numRecords = batch.getRecords().length;
    const successPercentage = numErrorRecords / numRecords;
    if (successPercentage < this.config.getMinSuccessfulTransformationPercentage()) {
      batch.setState(EtlState.ERROR);
    } else {
      batch.setState(EtlState.TRANSFORM_ENDED);
    }
  }
  async storeBatch(batch: EtlBatch) {
    batch.setState(EtlState.SAVE_STARTED);
    const destination = this.config.getEtlDestination();
    await destination.store(batch);
    if (batch.getState() !== EtlState.ERROR) {
      batch.setState(EtlState.SAVE_ENDED);
    }
  }
}
