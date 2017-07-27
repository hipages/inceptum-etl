// import { Context } from 'inceptum';
import * as config from 'config';
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

  // ************************************
  // Config functions
  // ************************************
  /**
   * Get an element from the configuration.
   * Can be both a leaf of the configuration, or an intermediate path. In the latter case it will return
   * an object with all the configs under that path.
   * It will throw an exception if the key doesn't exist.
   *
   * @param {string} key The key of the config we want
   * @param {*} defaultValue A default value to use if the key doesn't exist
   * @return {*} The requested configuration
   * @throws {Error} If the given key doesn't exist and a default value is not provided
   * @see {@link EtlConfig.hasConfig}
   */
  static getConfig(key: string, defaultValue?: any): any {
    if (!config.has(key) && defaultValue !== undefined) {
      return defaultValue;
    }
    return config.get(key);
  }

  // tslint:disable-next-line:prefer-function-over-method
  public getConfig(key: string, defaultValue?: any): any {
    if (this.hasOwnProperty(key)) {
      const upKey = key.charAt(0).toUpperCase() + key.slice(1);
      return this[`get${upKey}`]();
    }
    return EtlConfig.getConfig(key, defaultValue);
  }

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
