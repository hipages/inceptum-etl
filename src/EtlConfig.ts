import { EtlDestination } from './EtlDestination';
import { EtlSource } from './EtlSource';
import { EtlTransformer } from './EtlTransformer';

export abstract class EtlConfig {
  name: string;
  etlSource: EtlSource;
  etlTransformer: EtlTransformer;
  etlDestination: EtlDestination;
  maxEtlSourceRetries: number;
  etlSourceTimeoutMillis: number;
  etlTransformerTimeoutMillis: number;
  etlDestinationTimeoutMillis: number;
  etlDestinationBatchSize: number;
  minSuccessfulTransformationPercentage = 1;

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
}
