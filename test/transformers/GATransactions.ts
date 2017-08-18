import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import { GATransactions } from '../../src/transformers/GATransactions';
import { EtlBatchRecord } from '../../src/EtlBatch';

interface GATransactionData {
    transactionid: string,
    campaign: string,
    source: string,
    adgroup: string,
    medium: string,
    keyword: string,
    landingpagepath: string,
    admatchedquery: string,
    devicecategory: string,
    browser: string,
    browserversion: string,
    browsersize: string,
}

interface GATransformedData {
    transaction_id: string,
    job_id: number,
    partner_job_id:	number,
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

@suite.only class gaTransactionsTest {

    private inputData: GATransactionData[];
    private outputData: GATransformedData[];
    private batchRecords: EtlBatchRecord[];

    before() {
        this.inputData = [];
        this.outputData = [];
        this.batchRecords = [];

        // init test data
        this.inputData[0] = {
            transactionid: 'JOB3649837',
            campaign: 'TBD',
            source: 'google',
            adgroup: 'TBD',
            medium: 'TBD',
            keyword: 'TBD',
            landingpagepath: 'TBD',
            admatchedquery: '(not set)',
            devicecategory: 'tablet',
            browser: 'Chrome',
            browserversion: '59.0.3071.125',
            browsersize: '1100x1290',
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
        const gaTransactions = new GATransactions();
        // for( let key in this.batchRecords) {
        this.batchRecords.map((bRecord, key) => {
            gaTransactions.transformBatchRecord(bRecord);
            const outputD = this.outputData[key];
            bRecord.getTransformedData().must.be.eql(outputD);
        });
    }
}
