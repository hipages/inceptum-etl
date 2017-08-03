import { EtlSavepointManager } from '../EtlSavepointManager';

export class StaticSavepointManager extends EtlSavepointManager {
  savepoint: string;
  constructor(savepoint: string) {
      super();
      this.savepoint = savepoint;
  }
  async getSavePoint(): Promise<string> {
    return this.savepoint;
  }
  async updateSavepoint(newSavepoint: string) {
    this.savepoint = newSavepoint;
  }
}
