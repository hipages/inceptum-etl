// External dependencies
import { must } from 'must';
import * as sinon from 'sinon';
import * as moment from 'moment';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
// Internal dependencies
import { EtlBatch, EtlState, EtlBatchRecord } from '../../src/EtlBatch';
import { SmartFieldMapping, SmartFieldMappingConfig } from '../../src/transformers/SmartFieldMapping';
// Test Config
const gaConfig = utilConfig.get('transformers.smartfieldmapping');

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

  public downloadFromS3(): Promise<any> {
      return super.downloadFromS3();
  }
  public getRegexFromUrl(): Promise<any> {
      return super.getRegexFromUrl();
  }
  public add(transformedData: object = {}, input: object, fields: object, key: string): object {
      return super.add(transformedData, input, fields, key);
  }
  public replace(transformedData: object = {}, input: object, fields: object, key: string): object {
      return super.replace(transformedData, input, fields, key);
  }
  public regexAdd(transformedData: object = {}, input: object, fields: object, key: string): object {
      return super.regexAdd(transformedData, input, fields, key);
  }
  public fetchValue(obj: object, input?: object): string  {
      return super.fetchValue(obj, input);
  }
  public regexReplace(landingPagePath: string): string {
      return super.regexReplace(landingPagePath);
  }
  public getRegex(): object {
    this.regexCollection = {
      '^\/account': 'Login Area',
      '/login': 'Login',
    };
    return super.getRegex();
  }
  public delete(transformedData: object = {}, input: object, fields: object, key: string): object {
    return super.delete(transformedData, input, fields, key);
  }
  public mapReplace(transformedData: object = {}, input: object, fields: object, key: string): object {
    return super.mapReplace(transformedData, input, fields, key);
  }
  public mapAdd(transformedData: object = {}, input: object, fields: object, key: string): object {
    return super.mapAdd(transformedData, input, fields, key);
  }
  public convertDateTimeToUTC(transformedData: object = {}, input: object, fields: object, key: string): object {
    return super.convertDateTimeToUTC(transformedData, input, fields, key);
  }
  public addDateTimeToUTC(transformedData: object = {}, input: object, fields: object, key: string): object {
    return super.addDateTimeToUTC(transformedData, input, fields, key);
  }

}


@suite class SmartFieldMappingTransformerTest {
  private inputData: GaLandingPageInputData[];
  private outputData: GaLandingPageOutputData[];
  private batchRecords: EtlBatchRecord[];
  private SmartFieldMapping: HelperSmartFieldMapping;

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

    this.SmartFieldMapping = new HelperSmartFieldMapping({
      etlName: 'SmartFieldMapping',
      tempDirectory: gaConfig.tempDirectory,
      regexPath: gaConfig.regexPath,
      bucket: gaConfig.bucket,
      fieldsMapping: gaConfig.fieldsMapping,
    });
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

  @test add() {
    const data = {
      id: 48162196,
      medium: 'email',
    };
    const input = {... data};
    const action = {
      action: 'add',
      value: 'Google Analytics',
    };
    const value = this.SmartFieldMapping.add(data, input, action, 'changeField');
    value.must.be.eql({
      id: 48162196,
      medium: 'email',
      changeField: 'Google Analytics',
    });
  }

  @test replace() {
    const data = {
      id: 48162196,
      changeField: 'email',
    };
    const input = {... data};
    const action = {
      action: 'replace',
      value: '5',
    };
    const value = this.SmartFieldMapping.replace(data, input, action, 'changeField');
    value.must.be.eql({
      id: 48162196,
      changeField: '5',
    });
  }

  @test fetchValue() {
    const data = {
      id: 48162196,
      changeField: 'email',
    };
    const value = this.SmartFieldMapping.fetchValue({ value: '5' }, data);
    value.must.be.eql('5');
    const value1 = this.SmartFieldMapping.fetchValue({ field: 'id' }, data);
    value1.must.be.eql(48162196);
  }

  @test delete() {
    const data = {
      id: 48162196,
      changeField: 'email',
    };
    const input = {... data};
    const action = {
      action: 'delete',
    };
    const value = this.SmartFieldMapping.delete(data, input, action, 'id');
    value.must.be.eql({
      changeField: 'email',
    });
  }

  @test mapReplace() {
    const data = {
      id: 48162196,
      email: 'email',
    };
    const input = {... data};
    const action = {
      action: 'mapReplace',
      field: 'email',
      values: {email: 'test@gmail.com', other: 'this value'},
    };
    const value = this.SmartFieldMapping.mapReplace(data, input, action, 'changeField');
    value.must.be.eql({
      id: 48162196,
      changeField: 'test@gmail.com',
    });
  }

  @test mapReplaceOne() {
    const data = {
      id: 48162196,
      email: 'email',
    };
    const input = {... data};
    const action = {
      action: 'mapReplace',
      values: {email: 'test@gmail.com', other: 'this value'},
    };
    const value = this.SmartFieldMapping.mapReplace(data, input, action, 'email');
    value.must.be.eql({
      id: 48162196,
      email: 'test@gmail.com',
    });
  }

  @test mapAdd() {
    const data = {
      id: 48162196,
      email: 'email',
    };
    const input = {... data};
    const action = {
      action: 'mapAdd',
      field: 'email',
      values: {email: 'test@gmail.com', other: 'this value'},
    };
    const value = this.SmartFieldMapping.mapAdd(data, input, action, 'changeField');
    value.must.be.eql({
      id: 48162196,
      email: 'email',
      changeField: 'test@gmail.com',
    });
  }

  @test convertDateTimeToUTC() {
    const data = {
      id: 48162196,
      myTime: '2017-10-27 13:18:40',
    };
    const input = {... data};
    const action = {
      action: 'convertDateTimeToUTC',
      field: 'myTime',
      format: 'YYYYMMDD HHmmss',
    };
    const value = this.SmartFieldMapping.convertDateTimeToUTC(data, input, action, 'myTime');
    value.must.be.eql({
      id: 48162196,
      myTime: '20171027 021840',
    });
  }

  @test convertDateTimeToUTCTest1() {
    const data = {
      id: 48162196,
      myTime: '2017-10-27 13:18:40',
    };
    const input = {... data};
    const action = {
      action: 'convertDateTimeToUTC',
      field: 'myTime',
      format: 'YYYYMMDD HHmmss',
    };
    const value = this.SmartFieldMapping.convertDateTimeToUTC(data, input, action, 'myTime');
    value.must.be.eql({
      id: 48162196,
      myTime: '20171027 021840',
    });
  }

  @test convertDateTimeToUTCTest2() {
    const data = {
      id: 48162196,
      myTime: '2017-10-27 13:18:40',
    };
    const input = {... data};
    const action = {
      action: 'convertDateTimeToUTC',
      field: 'myTime',
      format: 'HHmm',
      type: 'number',
    };
    const value = this.SmartFieldMapping.convertDateTimeToUTC(data, input, action, 'myTime');
    value.must.be.eql({
      id: 48162196,
      myTime: 218,
    });
  }

  @test addDateTimeToUTC() {
    const data = {
      id: 48162196,
      myTime: '2017-10-27 13:18:40',
    };
    const input = {... data};
    const action = {
      action: 'convertDateTimeToUTC',
      field: 'myTime',
      format: 'YYYYMMDD HH:mm:ss',
    };
    const value = this.SmartFieldMapping.addDateTimeToUTC(data, input, action, 'utcTime');
    value.must.be.eql({
      id: 48162196,
      myTime: '2017-10-27 13:18:40',
      utcTime: '20171027 02:18:40',
    });
  }

}
