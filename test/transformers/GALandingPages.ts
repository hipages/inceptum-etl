import * as utilConfig from 'config';
import { must } from 'must';
import { mock, stub } from 'sinon';
import { parse } from 'url';
import { suite, test, slow, timeout } from 'mocha-typescript';
import { EtlBatchRecord } from '../../src/EtlBatch';
import { GALandingPages } from '../../src/transformers/GALandingPages';
import { Categories, Category } from '../../src/dao/dw/CategoryDao';

const fieldsMapping = utilConfig.get('transformers.galandingpages.test_4.fieldsMapping');

export interface GaLandingPageInputData {
    pages: string,
    source_account: string,
    report_date: string,
    medium: string,
    source: string,
    landingPagePath: string,
    deviceCategory: string,
    region: string,
    campaign: string,
    adGroup: string,
    landingContentGroup5: string,
    sessions: number,
    percentNewSessions: number,
    organicSearches: number,
    goal1Completions: number,
    goal15Completions: number,
    pageviews: number,
    record_created_date: string,
}

export interface GaLandingPageOutputData {
    source_account: string,
    report_date: string,
    base: string,
    page: string,
    category: string,
    category_parent_id: number,
    medium: string,
    source: string,
    landing_page_path: string,
    device_category: string,
    region: string,
    campaign: string,
    ad_group: string,
    landing_content_group5: string,
    sessions: number,
    percent_new_sessions: number,
    organic_searches: number,
    goal1_completions: number,
    goal15_completions: number,
    pageviews: number,
    record_created_date: string,
}

@suite class GALandingPagesTest {

    private inputData: GaLandingPageInputData[];
    private outputData: GaLandingPageOutputData[];
    private batchRecords: EtlBatchRecord[];
    private categories: Categories<Category> = {};
    private GALandingPages: GALandingPages;

    before() {
        const totalTCs = 2;

        this.inputData = [
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

        this.outputData = [
            {
                source_account: 'HIP',
                report_date: '2017-08-14 06:45:14',
                page: '/find/security_screens_doors',
                base: 'find',
                category: 'security_screens_doors',
                category_parent_id: 67,
                medium: 'referral',
                source: 'zipscreen.com.au',
                landing_page_path: '/find/security_screens_doors?some=query',
                device_category: 'desktop',
                region: 'Victoria',
                campaign: '15svideo',
                ad_group: '',
                landing_content_group5: '',
                sessions: 2,
                percent_new_sessions: 100,
                organic_searches: 123,
                goal1_completions: 3,
                goal15_completions: 2,
                pageviews: 4,
                record_created_date: '2017-08-14 06:45:14',
            },
            {   // homepage
                source_account: 'HIP',
                report_date: '2017-08-14 06:45:14',
                page: '/',
                base: 'homepage',
                category: '',
                category_parent_id: 0,
                medium: 'referral',
                source: 'yellowpages.com.au',
                landing_page_path: '/',
                device_category: 'desktop',
                region: 'Victoria',
                campaign: '15svideo',
                ad_group: '',
                landing_content_group5: '',
                sessions: 2,
                percent_new_sessions: 100,
                organic_searches: 123,
                goal1_completions: 3,
                goal15_completions: 2,
                pageviews: 4,
                record_created_date: '2017-08-14 06:45:14',
            },
            {   // photos kitchen_renovations
                source_account: 'HIP',
                report_date: '2017-08-14 06:45:14',
                page: '/photos/kitchens',
                base: 'homepage',
                category: 'kitchen_renovations',
                category_parent_id: 68,
                medium: 'referral',
                source: 'yellowpages.com.au',
                landing_page_path: '/photos/kitchens',
                device_category: 'desktop',
                region: 'Victoria',
                campaign: '15svideo',
                ad_group: '',
                landing_content_group5: '',
                sessions: 2,
                percent_new_sessions: 100,
                organic_searches: 123,
                goal1_completions: 3,
                goal15_completions: 2,
                pageviews: 4,
                record_created_date: '2017-08-14 06:45:14',
            },
        ];

        this.batchRecords = [];
        for (let i = 0; i < totalTCs; i++) {
            this.batchRecords[i] = new EtlBatchRecord(this.inputData[i]);
        }

        this.categories['security_screens_doors'] = {
            category_id: 123,
            category_seo_key: 'security_screens_doors',
            parent_category_id: 67,
        };
        this.categories['kitchen_renovations'] = {
            category_id: 124,
            category_seo_key: 'kitchen_renovations',
            parent_category_id: 68,
        };
        const DBClient = {};
        const DBClientMock = mock(DBClient);
        this.GALandingPages = new GALandingPages(DBClientMock, fieldsMapping);
    }

    @test public transformRecord() {
        this.GALandingPages.setCategories(this.categories);
        this.batchRecords.map((bRec, i) => {
            // tslint:disable-next-line:no-unused-expression
            this.GALandingPages.transformRecord(bRec);
            bRec.getTransformedData().must.be.eql(this.outputData[i]);
        });
    }

    @test testParsePath() {
        const testPaths = [
            '/https://www.homeimprovementpages.com.au/account/plan/webview#/',
            '/photos/kitchens',
            '/login?i=o&oi19=123',
            '/page.php?o=91&v=132',
            '/login/success/redirect.php?i=o&oi19=123',
            '/',
        ];

        const resultPaths = [
            '/https://www.homeimprovementpages.com.au/account/plan/webview',
            '/photos/kitchens',
            '/login',
            '/page.php',
            '/login/success/redirect.php',
            '/',
        ];

        testPaths.map((p, i) => {
            this.GALandingPages.parsePagePath(p).must.be.equal(resultPaths[i]);
        });
    }

    @test testExtractBaseFromPage() {
        const inputs: string[] = [
            '/https://www.homeimprovementpages.com.au/account/plan/webview',
            '/photos/kitchens',
            '/login',
            '/page.php',
            '/login/success/redirect.php',
            '/',
            '(not set)',
        ];

        const expects: string[] = [
            'https:',
            'photos',
            'login',
            'page.php',
            'login',
            'homepage',
            '(not set)',
        ];

        inputs.map((s, i) => {
            this.GALandingPages.extractBaseFromPage(s).must.be.equal(expects[i]);
        });
    }

    @test findCategory() {
        const testCases = [
            {
                page: '/fiNd_0192830/carpenters_renovations/get_quotes_simple_find', // find_
                base: 'fiNd_0192830',
                category: 'carpenters_renovations',
            },
            {
                page: '/fiNd_0192830', // find_ & empty
                base: 'fiNd_0192830',
                category: '',
            },
            {
                page: '/local_categories/carpenters_renovations/get_quotes_simple_find', // category after base
                base: 'local_categories',
                category: 'carpenters_renovations',
            },
            {
                page: '/photos/Modern/bathrooms', // base is photo & cat in photo style
                base: 'photos',
                category: 'bathroom_renovations',
            },
            {
                page: '/photo/pools/', // base is photo & cat in photo category
                base: 'photo',
                category: 'pools_spas',
            },
        ];

        testCases.map((t) => {
            this.GALandingPages.findCategory(t.page, t.base).must.be.equal(t.category);
        });
    }
}

