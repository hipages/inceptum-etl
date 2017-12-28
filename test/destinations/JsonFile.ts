import * as fs from 'fs';
import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { JsonFile } from '../../src/destinations/JsonFile';
import { EtlBatch, EtlState } from '../../src/EtlBatch';

suite('JsonFile Destination', () => {
  suite('JsonFile test', () => {
    // init test data
    const etlBatch = [{
        transactionId: 'JOB3649837',
        campaign: 'TBD',
        source: 'google',
        adGroup: 'TBD',
        medium: 'TBD',
        keyword: 'TBD',
        landingPagePath: 'TBD',
        adMatchedQuery: '(not set)',
        deviceCategory: 'tablet',
        browser: 'Chrome',
        browserVersion: '59.0.3071.125',
        browserSize: '1100x1290',
    }];
    const directory = require('path').join(__dirname, '/tmp');
    const baseFileName = 'CsvFileTest';
    const cleanUpDirectory = false;
    test('Create new instance of JsonFile', async () => {
      const thisFile = new JsonFile(directory, baseFileName, cleanUpDirectory);
      thisFile.must.be.an.instanceof(JsonFile);
    });
    test('Create store batch to JsonFile', async () => {
      const thisFile = new JsonFile(directory, baseFileName, cleanUpDirectory);
      const batch = new EtlBatch(etlBatch);
      batch.getRecords().map( (record) => (record.setTransformedData(record.getData())));
      const fileFullName = await thisFile.store(batch);
      fileFullName.must.be.an.string();
      const output = await fs.readFileSync(fileFullName, 'utf8');
      output.replace(/\t/g, '').replace(/\n/g, '').must.be.eql(`[{"transactionId": "JOB3649837","campaign": "TBD","source": "google","adGroup": "TBD","medium": "TBD","keyword": "TBD","landingPagePath": "TBD","adMatchedQuery": "(not set)","deviceCategory": "tablet","browser": "Chrome","browserVersion": "59.0.3071.125","browserSize": "1100x1290"}]`);
    });
    test('Create store batch to JsonFile single object ', async () => {
      const thisFile = new JsonFile(directory, baseFileName, cleanUpDirectory, true);
      const batch = new EtlBatch(etlBatch);
      batch.getRecords().map( (record) => (record.setTransformedData(record.getData())));
      const fileFullName = await thisFile.store(batch);
      fileFullName.must.be.an.string();
      const output = await fs.readFileSync(fileFullName, 'utf8');
      output.replace(/\t/g, '').replace(/\n/g, '').must.be.eql(`{"transactionId": "JOB3649837","campaign": "TBD","source": "google","adGroup": "TBD","medium": "TBD","keyword": "TBD","landingPagePath": "TBD","adMatchedQuery": "(not set)","deviceCategory": "tablet","browser": "Chrome","browserVersion": "59.0.3071.125","browserSize": "1100x1290"}`);
    });
  });
});
