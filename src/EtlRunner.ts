import { EtlConfig } from './EtlConfig';


export class EtlRunner {
  public executeEtl(config: EtlConfig): Promise<void> {
    const source = config.getEtlSource();
    this.getSavePoint(config);
    source.initSavePoint(null, null);
    while (source.hasNextBatch()) {
      source.getNextBatch();
    }
    return Promise.resolve();
  }
  // tslint:disable-next-line:prefer-function-over-method
  public getSavePoint(config: EtlConfig) {
    return null;
  }
}
