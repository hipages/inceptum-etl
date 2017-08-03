/**
 * Stores and retrives the save point for the ETL
 */
export abstract class EtlSavepointManager {
  public async abstract getSavePoint(): Promise<string>;
  public async abstract updateSavepoint(newSavepoint: string);
}
