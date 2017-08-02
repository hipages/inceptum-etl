// import { Context } from 'inceptum';
import * as config from 'config';
import { EtlDestination } from './EtlDestination';
import { EtlSource } from './EtlSource';
import { EtlTransformer } from './EtlTransformer';
import { EtlSavepointManager } from './EtlSavepointManager';

export class EtlConfig {
  protected name: string;
  protected etlSource: EtlSource;
  protected etlTransformer: EtlTransformer;
  protected etlDestination: EtlDestination;
  protected etlSavepointManager: EtlSavepointManager;
  protected maxEtlSourceRetries: number;
  protected etlSourceTimeoutMillis: number;
  protected etlTransformerTimeoutMillis: number;
  protected minSuccessfulTransformationPercentage = 1;
  protected maxEtlDestinationRetries: number;
  protected etlDestinationTimeoutMillis: number;
  protected etlDestinationBatchSize: number;

  public getName(): string {
    return this.name;
  }
  public getEtlSource(): EtlSource {
    return this.etlSource;
  }
  public getMaxEtlSourceRetries(): number {
   return this.maxEtlSourceRetries;
  }
  public getEtlSourceTimeoutMillis(): number {
    return this.etlSourceTimeoutMillis;
  }
  public getEtlTransformer(): EtlTransformer {
    return this.etlTransformer;
  }
  public getEtlTransformerTimeoutMillis(): number {
    return this.etlTransformerTimeoutMillis;
  }
  public getMinSuccessfulTransformationPercentage(): number {
    return this.minSuccessfulTransformationPercentage;
  }
  public getEtlDestination(): EtlDestination {
    return this.etlDestination;
  }
  public getEtlDestinationTimeoutMillis(): number {
    return this.etlDestinationTimeoutMillis;
  }
  public getEtlDestinationBatchSize(): number {
    return this.etlDestinationBatchSize;
  }
  public getMaxEtlDestinationRetries(): number {
    return this.maxEtlDestinationRetries;
  }
  public getEtlSavepointManager(): EtlSavepointManager {
    return this.etlSavepointManager;
  }
  public setName(value: string) {
    this.name = value;
  }
  public setEtlSource(etlSource: EtlSource) {
    this.etlSource = etlSource;
  }
  public setEtlTransformer(etlTransformer: EtlTransformer) {
    this.etlTransformer = etlTransformer;
  }
  public setEtlDestination(etlDestination: EtlDestination) {
    this.etlDestination = etlDestination;
  }
  public setMaxEtlSourceRetries(maxEtlSourceRetries: number) {
    this.maxEtlSourceRetries = maxEtlSourceRetries;
  }
  public setEtlSourceTimeoutMillis(etlSourceTimeoutMillis: number) {
    this.etlSourceTimeoutMillis = etlSourceTimeoutMillis;
  }
  public setEtlTransformerTimeoutMillis(etlTransformerTimeoutMillis: number) {
    this.etlTransformerTimeoutMillis = etlTransformerTimeoutMillis;
  }
  public setMinSuccessfulTransformationPercentage(minSuccessfulTransformationPercentage: number) {
    this.minSuccessfulTransformationPercentage = minSuccessfulTransformationPercentage;
  }
  public setEtlDestinationTimeoutMillis(etlDestinationTimeoutMillis: number) {
    this.etlDestinationTimeoutMillis = etlDestinationTimeoutMillis;
  }
  public setEtlDestinationBatchSize(etlDestinationBatchSize: number) {
    this.etlDestinationBatchSize = etlDestinationBatchSize;
  }
  public setMaxEtlDestinationRetries(maxEtlDestinationRetries: number) {
    this.maxEtlDestinationRetries = maxEtlDestinationRetries;
  }
  public setEtlSavepointManager(etlSavepointManager: EtlSavepointManager) {
    this.etlSavepointManager = etlSavepointManager;
  }
}
