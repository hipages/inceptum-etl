import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlConfig } from '../src/EtlConfig';

suite('EtlConfig', () => {
  suite('Etl config test', () => {
    test('Basic Getters and setters', async () => {
      const config = new EtlConfig();
      config.setName('test etl');
      config.getName().must.be.equal('test etl');
      config.setMaxEtlSourceRetries(5);
      config.getMaxEtlSourceRetries().must.be.equal(5);
      config.setEtlSourceTimeoutMillis(10);
      config.getEtlSourceTimeoutMillis().must.be.equal(10);
      config.setEtlTransformerTimeoutMillis(11);
      config.getEtlTransformerTimeoutMillis().must.be.equal(11);
      config.setEtlDestinationTimeoutMillis(12);
      config.getEtlDestinationTimeoutMillis().must.be.equal(12);
      config.setEtlDestinationBatchSize(1);
      config.getEtlDestinationBatchSize().must.be.equal(1);
      config.setMinSuccessfulTransformationPercentage(0.5);
      config.getMinSuccessfulTransformationPercentage().must.be.equal(0.5);
    });
    test('Test getConfig method', async () => {
      const config = new EtlConfig();
      config.setName('test etl');
      config.getName().must.be.equal('test etl');
    });
  });
});
