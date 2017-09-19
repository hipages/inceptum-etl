import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import { InceptumApp, Context } from 'inceptum';
import { EtlBatch } from '../../src/EtlBatch';
import { SimpleCopy } from '../../src/transformers/SimpleCopy';
import { TransformerPlugin } from '../../src/transformers/TransformerPlugin';

interface SimpleCopyData {
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

@suite class SimpleCopyTest {

    private inputData: SimpleCopyData[];
    private batch: EtlBatch;

    before() {
        this.inputData = [];
        // init test data
        this.inputData[0] = {
            transactionId: 'JOB3649837',
            campaign: 'TBD',
            source: 'google',
            adGroup: 'TBD',
            medium: 'TBD',
            keyword: 'TBD - keyword',
            landingPagePath: 'TBD?xxx=2',
            adMatchedQuery: '(not set)',
            deviceCategory: 'tablet',
            browser: 'Chrome',
            browserVersion: '59.0.3071.125',
            browserSize: '1100x1290',
        };

        this.batch = new EtlBatch(this.inputData, 1, 1, 'testBatch');
    }

    /**
     * Validate class using plugin
     */
    @test async transformRecord() {
        const app = new InceptumApp();
        const context = app.getContext();
        const pluginObj = new TransformerPlugin('test_2');
        app.use(pluginObj);

        await app.start();
        const gaTransactions = await context.getObjectByName('EtlTransformer');
        await gaTransactions.transform(this.batch);
        const batchRecords = this.batch.getRecords();
        batchRecords.map((bRecord, key) => {
            const outputD = this.inputData[key];
            bRecord.getTransformedData().must.be.eql(outputD);
        });
    }
}
