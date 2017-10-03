import { LogManager } from 'inceptum';
import { EtlBatch } from '../EtlBatch';
import { EtlDestination } from '../EtlDestination';

const log = LogManager.getLogger();

type ElasticClient = { // TODO export the real client inceptum
  bulk(object: Object): Promise<void>
}

export class ElasticsearchIndex extends EtlDestination {

  private elasticClient: ElasticClient;

  static autowire = {
    elasticClient: 'Elastic',
  };

  public async store(batch: EtlBatch): Promise<void> {
    if (!this.elasticClient) {
      throw new Error('Please install Elasticsearch');
    }

    const data = batch.getTransformedRecords();
    try {
      return await this.elasticClient.bulk(data);
    } catch (error) {
      log.fatal('Didnt save');
      throw error;
    }
  }
}
