import * as fs from 'fs';
import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { CsvFile } from '../../src/destinations/CsvFile';
import { EtlBatch, EtlState } from '../../src/EtlBatch';

suite('CsvFile Destination', () => {
  suite('CsvFile test', () => {
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
    const cleanUpDirectory = true;
    const thisFile = new CsvFile(directory, baseFileName, cleanUpDirectory);
    test('Create new instance of CsvFile', async () => {
      thisFile.must.be.an.instanceof(CsvFile);
    });
    test('Create store batch to CsvFile', async () => {
        const batch = new EtlBatch(etlBatch);
        batch.getRecords().map( (record) => (record.setTransformedData(record.getData())));
        const fileFullName = await thisFile.store(batch);
        fileFullName.must.be.an.string();
        const output = await fs.readFileSync(fileFullName, 'utf8');
        output.must.be.eql(`"transactionId","campaign","source","adGroup","medium","keyword","landingPagePath","adMatchedQuery","deviceCategory","browser","browserVersion","browserSize"\n"JOB3649837","TBD","google","TBD","TBD","TBD","TBD","(not set)","tablet","Chrome","59.0.3071.125","1100x1290"`);
    });
  });
});
