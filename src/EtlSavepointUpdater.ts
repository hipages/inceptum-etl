
/**
 * A utility object that gets passed to the EtlSource so it can notify the framework
 * of when the savepoint needs to be updated
 */
export interface EtlSavepointUpdater {
  updateSavepoint(newSavepoint: string),
}
