import { EtlDestination } from './EtlDestination';
import { EtlSource } from './EtlSource';
import { EtlTransformer } from './EtlTransformer';

export class EtlConfig {
  private name: string;
  private etlSource: EtlSource;
  private etlTransformer: EtlTransformer;
  private etlDestination: EtlDestination;
  private maxEtlSourceRetries: number;
  private etlSourceTimeoutMillis: number;
  private etlTransformerTimeoutMillis: number;
  private etlDestinationTimeoutMillis: number;
  private etlDestinationBatchSize: number;
  private minSuccessfulTransformationPercentage = 1;

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
  public getEtlDestination(): EtlDestination {
    return this.etlDestination;
  }
  public getEtlDestinationTimeoutMillis(): number {
    return this.etlDestinationTimeoutMillis;
  }
  public getEtlDestinationBatchSize(): number {
    return this.etlDestinationBatchSize;
  }
  public getMinSuccessfulTransformationPercentage(): number {
    return this.minSuccessfulTransformationPercentage;
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
  public setEtlDestinationTimeoutMillis(etlDestinationTimeoutMillis: number) {
    this.etlDestinationTimeoutMillis = etlDestinationTimeoutMillis;
  }
  public setEtlDestinationBatchSize(etlDestinationBatchSize: number) {
    this.etlDestinationBatchSize = etlDestinationBatchSize;
  }
  public setMinSuccessfulTransformationPercentage(minSuccessfulTransformationPercentage: number) {
    this.minSuccessfulTransformationPercentage = minSuccessfulTransformationPercentage;
  }
}
