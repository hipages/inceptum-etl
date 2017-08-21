import * as utilConfig from 'config';
import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import { GATransactions } from '../../src/transformers/GATransactions';
import { EtlBatchRecord } from '../../src/EtlBatch';

const fieldsMapping = utilConfig.get('transformers.gatransactions.test_3.fieldsMapping');

interface GATransactionData {
    transactionId: string,
    campaign: string,
    source: string,
    adGroup: string,
    medium: string,
    keyword: string,
    landingPagePath: string,
    adMatchedQuery: string,
    deviceCategory: string,
    browser: string,
    browserVersion: string,
    browserSize: string,
}

interface GATransformedData {
    job_id: number,
    partner_job_id:	number,
    transaction_id: string,
    campaign: string,
    source: string,
    ad_group: string,
    medium: string,
    keyword: string,
    landing_page_path: string,
    ad_matched_query: string,
    device_category: string,
    browser: string,
    browser_version: string,
    browser_size: string,
}

@suite class gaTransactionsTest {

    private inputData: GATransactionData[];
    private outputData: GATransformedData[];
    private batchRecords: EtlBatchRecord[];

    before() {
        this.inputData = [];
        this.outputData = [];
        this.batchRecords = [];

        // init test data
        this.inputData[0] = {
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
        };

        this.outputData[0] = {
            transaction_id: 'JOB3649837',
            job_id: 3649837,
            partner_job_id:	3649837,
            campaign: 'TBD',
            source: 'google',
            ad_group: 'TBD',
            medium: 'TBD',
            keyword: 'TBD',
            landing_page_path: 'TBD',
            ad_matched_query: '(not set)',
            device_category: 'tablet',
            browser: 'Chrome',
            browser_version: '59.0.3071.125',
            browser_size: '1100x1290',
        };

        this.batchRecords[0] = new EtlBatchRecord(this.inputData[0]);
    }

    @test transformRecord() {
        const gaTransactions = new GATransactions(fieldsMapping);
        // for( let key in this.batchRecords) {
        this.batchRecords.map((bRecord, key) => {
            gaTransactions.transformBatchRecord(bRecord);
            const outputD = this.outputData[key];
            bRecord.getTransformedData().must.be.eql(outputD);
        });
    }
}
