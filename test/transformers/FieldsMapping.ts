import { must } from 'must';
import * as nock from 'nock';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { EtlBatch } from '../../src/EtlBatch';
import { FieldsMapping } from '../../src/transformers/FieldsMapping';
import { TransformerPlugin } from '../../src/transformers/TransformerPlugin';

const testObject = [
    {
        pages: '/find/security_screens_doors',
        source_account: 'HIP',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'zipscreen.com.au',
        landingPagePath: '/find/security_screens_doors?some=query',
        deviceCategory: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        adGroup: '',
        landingContentGroup5: '',
        sessions: 2,
        percentNewSessions: 100,
        organicSearches: 123,
        goal1Completions: 3,
        goal15Completions: 2,
        pageviews: 4,
        record_created_date: '2017-08-14 06:45:14',
    },
    {   // homepage
        pages: '/',
        source_account: 'HIP',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landingPagePath: '/',
        deviceCategory: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        adGroup: '',
        landingContentGroup5: '',
        sessions: 2,
        percentNewSessions: 100,
        organicSearches: 123,
        goal1Completions: 3,
        goal15Completions: 2,
        pageviews: 4,
        record_created_date: '2017-08-14 06:45:14',
    },
    {   // photos kitchens
        pages: '/photos/kitchens',
        source_account: 'HIP',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landingPagePath: '/photos/kitchens',
        deviceCategory: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        adGroup: '',
        landingContentGroup5: '',
        sessions: 2,
        percentNewSessions: 100,
        organicSearches: 123,
        goal1Completions: 3,
        goal15Completions: 2,
        pageviews: 4,
        record_created_date: '2017-08-14 06:45:14',
    },
];

const testObjectResults = [
    {
        app_code: 'HIP',
        source_name: 'Adwords',
        source_account: 'hip',
        record_created_date: '2017-08-23 10:30:45',
        source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'zipscreen.com.au',
        landing_page_path: '/find/security_screens_doors?some=query',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
    {   // homepage
        app_code: 'HIP',
        source_name: 'Adwords',
        source_account: 'hip',
        record_created_date: '2017-08-23 10:30:45',
        source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landing_page_path: '/',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
    {   // photos kitchen_renovations
        app_code: 'HIP',
        source_name: 'Adwords',
        source_account: 'hip',
        record_created_date: '2017-08-23 10:30:45',
        source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landing_page_path: '/photos/kitchens',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
];

const testObjectResults2 = [
    {
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'zipscreen.com.au',
        landing_page_path: '/find/security_screens_doors?some=query',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
    {   // homepage
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landing_page_path: '/',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
    {   // photos kitchen_renovations
        report_date: '2017-08-14 06:45:14',
        medium: 'referral',
        source: 'yellowpages.com.au',
        landing_page_path: '/photos/kitchens',
        device_category: 'desktop',
        region: 'Victoria',
        campaign: '15svideo',
        ad_group: '',
        landing_content_group: '',
        sessions: 2,
        percent_new_sessions: 100,
        organic_searches: 123,
        goal_1_completions: 3,
        goal_15_completions: 2,
        pageviews: 4,
    },
];

suite('FieldsMapping', () => {
    suite('Test with fixedFields', () => {
        const config = utilConfig.get('transformers.fieldsmapping');
        const batch =  new EtlBatch(testObject, 1, 1, 'test_FieldsMapping');
        const transf = new FieldsMapping(config.fixedFields, config.mappedFields);
        test('Test configuration: fixedFields', async () => {
            const fixedFields = transf.getFixedFields();
            fixedFields.must.be.eql({
                app_code: 'HIP',
                source_name: 'Adwords',
                source_account: 'hip',
                record_created_date: '2017-08-23 10:30:45',
                source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
            });
        });
        test('Test configuration: mappedFields', async () => {
            const fixedFields = transf.getMappedFields();
            fixedFields.must.be.eql({
                report_date: 'report_date',
                medium: 'medium',
                source: 'source',
                landing_page_path: 'landingPagePath',
                device_category: 'deviceCategory',
                region: 'region',
                campaign: 'campaign',
                ad_group: 'adGroup',
                landing_content_group: 'landingContentGroup5',
                sessions: 'sessions',
                percent_new_sessions: 'percentNewSessions',
                organic_searches: 'organicSearches',
                goal_1_completions: 'goal1Completions',
                goal_15_completions: 'goal15Completions',
                pageviews: 'pageviews',
            });
        });
        test('Test transformation', async () => {
            await transf.transform(batch);
            const batchList = batch.getTransformedRecords();
            batchList[0].getTransformedData().must.be.eql(testObjectResults[0]);
            batchList[1].getTransformedData().must.be.eql(testObjectResults[1]);
            batchList[2].getTransformedData().must.be.eql(testObjectResults[2]);
        });
    });
    suite('Test with no fixedFields', () => {
        const config = utilConfig.get('etls.test_11.transformer');
        const batch =  new EtlBatch(testObject, 1, 1, 'test_FieldsMapping');
        const transf = new FieldsMapping(config.fixedFields, config.mappedFields);
        test('Test configuration: fixedFields', async () => {
            const fixedFields = transf.getFixedFields();
            fixedFields.must.be.eql({});
        });
        test('Test configuration: mappedFields', async () => {
            const fixedFields = transf.getMappedFields();
            fixedFields.must.be.eql({
                report_date: 'report_date',
                medium: 'medium',
                source: 'source',
                landing_page_path: 'landingPagePath',
                device_category: 'deviceCategory',
                region: 'region',
                campaign: 'campaign',
                ad_group: 'adGroup',
                landing_content_group: 'landingContentGroup5',
                sessions: 'sessions',
                percent_new_sessions: 'percentNewSessions',
                organic_searches: 'organicSearches',
                goal_1_completions: 'goal1Completions',
                goal_15_completions: 'goal15Completions',
                pageviews: 'pageviews',
            });
        });
        test('Test transformation', async () => {
            await transf.transform(batch);
            const batchList = batch.getTransformedRecords();
            batchList[0].getTransformedData().must.be.eql(testObjectResults2[0]);
            batchList[1].getTransformedData().must.be.eql(testObjectResults2[1]);
            batchList[2].getTransformedData().must.be.eql(testObjectResults2[2]);
        });
    });
    suite('Test using the plugin to ensure the parameters are passed:', async () => {
        const app = new BaseApp();
        const context = app.getContext();
        const pluginObj = new TransformerPlugin('test_10');
        const batch =  new EtlBatch(testObject, 1, 1, 'test_FieldsMapping');
        let transf: any;
        before('start', async () => {
          app.use(pluginObj);
          await app.start();
          transf = await context.getObjectByName('EtlTransformer');
        });

        test('Test configuration: fixedFields', async () => {
            const fixedFields = transf.getFixedFields();
            fixedFields.must.be.eql({
                app_code: 'HIP',
                source_name: 'Adwords',
                source_account: 'hip',
                record_created_date: '2017-08-23 10:30:45',
                source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
            });
        });
        test('Test configuration: mappedFields', async () => {
            const fixedFields = transf.getMappedFields();
            fixedFields.must.be.eql({
                report_date: 'report_date',
                medium: 'medium',
                source: 'source',
                landing_page_path: 'landingPagePath',
                device_category: 'deviceCategory',
                region: 'region',
                campaign: 'campaign',
                ad_group: 'adGroup',
                landing_content_group: 'landingContentGroup5',
                sessions: 'sessions',
                percent_new_sessions: 'percentNewSessions',
                organic_searches: 'organicSearches',
                goal_1_completions: 'goal1Completions',
                goal_15_completions: 'goal15Completions',
                pageviews: 'pageviews',
            });
        });
        test('Test transformation', async () => {
            await transf.transform(batch);
            const batchList = batch.getTransformedRecords();
            batchList[0].getTransformedData().must.be.eql(testObjectResults[0]);
            batchList[1].getTransformedData().must.be.eql(testObjectResults[1]);
            batchList[2].getTransformedData().must.be.eql(testObjectResults[2]);
        });

        after('stop', async () => {
            await app.stop();
          });
    });
});
