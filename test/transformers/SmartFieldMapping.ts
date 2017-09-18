// External dependencies
import { must } from 'must';
import * as sinon from 'sinon';
import * as moment from 'moment';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
// Internal dependencies
import { EtlBatch, EtlState, EtlBatchRecord } from '../../src/EtlBatch';
import { SmartFieldMapping } from '../../src/transformers/SmartFieldMapping';
// Test Config
const gaConfig = utilConfig.get('transformers.smartfieldmapping.test_8');

export interface GaLandingPageInputData {
  id: number,
  account: string,
  medium: string,
  source: string,
  page: string,
  base: string,
  landing_page_path: string,
  category: string,
  category_parent_id: number,
  device_category: string,
  region: string,
  campaign: string,
  adwords_campaign_id: number,
  report_date: string,
  sessions: number,
  percent_new_sessions: number,
  organic_searches: number,
  goal_1_completions: number,
  goal_15_completions: number,
  pageviews: number,
  created_by_date: string,
}

export interface GaLandingPageOutputData {
  id: number,
  medium: string,
  source: string,
  page: string,
  base: string,
  landing_page_path: string,
  category: string,
  category_parent_id: number,
  device_category: string,
  region: string,
  campaign: string,
  adwords_campaign_id: number,
  report_date: string,
  sessions: number,
  percent_new_sessions: number,
  organic_searches: number,
  goal_1_completions: number,
  goal_15_completions: number,
  pageviews: number,
  app_code: string,
  source_name: string,
  source_time_zone: string,
  source_account: string,
  record_created_date: string,
  landing_content_group5: string,
}

class HelperSmartFieldMapping extends SmartFieldMapping {

        public exposeDownloadFromS3(): Promise<any> {
            return this.downloadFromS3();
        }
        public exposeGetRegexFromUrl(): Promise<any> {
            return this.getRegexFromUrl();
        }
        public exposeTransformBatchRecord(record: EtlBatchRecord) {
            return this.transformBatchRecord(record);
        }
        public exposeAdd(transformedData: object = {}, input: object, fields: object, key: string): object {
            return this.add(transformedData, input, fields, key);
        }
        public exposeReplace(transformedData: object = {}, input: object, fields: object, key: string): object {
            return this.replace(transformedData, input, fields, key);
        }
        public exposeRegexAdd(transformedData: object = {}, input: object, fields: object, key: string): object {
            return this.regexAdd(transformedData, input, fields, key);
        }
        public exposeFetchValue(obj: object, input?: object): string  {
            return this.fetchValue(obj, input);
        }
        public exposeGetRegex(): any {
            return this.getRegex();
        }
        public exposeRegexReplace(landingPagePath: string): string {
            return this.regexReplace(landingPagePath);
        }
        public getRegex(): object {
          this.regexCollection = {
            '^\/account': 'Login Area',
            '/login': 'Login',
          };
          return super.getRegex();
        }
}


@suite class SmartFieldMappingTransformerTest {
  private inputData: GaLandingPageInputData[];
  private outputData: GaLandingPageOutputData[];
  private batchRecords: EtlBatchRecord[];
  private SmartFieldMapping: SmartFieldMapping;

  before() {
    const totalTCs = 1;
    this.inputData = [
      {
        id: 48162196,
        account: 'HIP',
        medium: 'email',
        source: 'gq_correspondence',
        page: '/account/',
        base: 'account',
        landing_page_path: '/account/?m=job&action=job&no_left_nav=1&responsive=1&auto_answer_jaid=324261473&site_question_contact=1&style=hui_look',
        category: '',
        category_parent_id: 0,
        device_category: 'mobile',
        region: 'Victoria',
        campaign: '24_hour_fulfilled_follow_up',
        adwords_campaign_id: 0,
        report_date: '2017-08-27',
        sessions: 1,
        percent_new_sessions: 100,
        organic_searches: 0,
        goal_1_completions: 0,
        goal_15_completions: 0,
        pageviews: 10,
        created_by_date: '2017-08-28 06:31:44',
      },
    ];
    this.outputData = [
      {
        id: 48162196,
        medium: 'email',
        source: 'gq_correspondence',
        page: '/account/',
        base: 'account',
        landing_page_path: '/account/?m=job&action=job&no_left_nav=1&responsive=1&auto_answer_jaid=324261473&site_question_contact=1&style=hui_look',
        category: '',
        category_parent_id: 0,
        device_category: 'mobile',
        region: 'Victoria',
        campaign: '24_hour_fulfilled_follow_up',
        adwords_campaign_id: 0,
        report_date: '2017-08-27',
        sessions: 1,
        percent_new_sessions: 100,
        organic_searches: 0,
        goal_1_completions: 0,
        goal_15_completions: 0,
        pageviews: 10,
        app_code: 'HIP',
        source_name: 'Google Analytics',
        source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
        source_account: 'HIP',
        record_created_date: '2017-08-28 06:31:44',
        landing_content_group5: 'Login Area',
      },
    ];

    this.batchRecords = [];
    for (let i = 0; i < totalTCs; i++) {
        this.batchRecords[i] = new EtlBatchRecord(this.inputData[i]);
    }
    this.SmartFieldMapping = new HelperSmartFieldMapping(
      'SmartFieldMapping',
      gaConfig.tempDirectory,
      gaConfig.regexPath,
      gaConfig.bucket,
      gaConfig.fieldsMapping,
    );
  }

  @test transformBatchRecord() {
    this.batchRecords.map((bRec, i) => {
        // tslint:disable-next-line:no-unused-expression
        this.SmartFieldMapping.transformBatchRecord(bRec);
          bRec.getTransformedData().must.be.eql(this.outputData[i]);
    });
  }

  @test isURL() {
    const urlCheck = HelperSmartFieldMapping.isURL('http://www.google.com');
    urlCheck.must.be.true();
  }

  @test isS3URL() {
    const urlCheck = HelperSmartFieldMapping.isS3URL('http://s3-us-west-2.amazonaws.com/bucketName');
    urlCheck.must.be.true();
  }

}
