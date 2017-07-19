
/**
 * A utility object that gets passed to the EtlSource so it can notify the framework
 * of when the savepoint needs to be updated
 */
export abstract class EtlSavepointUpdater {
  async abstract updateSavepoint(newSavepoint: string);
}
