import { must } from 'must';
import * as nock from 'nock';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp } from 'inceptum';
import { EtlBatch } from '../../src/EtlBatch';
import { SplitAdwordsCampaign } from '../../src/transformers/SplitAdwordsCampaign';
import { TransformerPlugin } from '../../src/transformers/TransformerPlugin';


const testObjectClicks = [
  {
    account: 'HI:KLMN > AU',
    campaign: 'Landscaping & Gardening:2|NA:NA > QLD(Landscaping)',
    campaign_id: '391031215',
    ad_group: 'Landscaping & Gardening:2|NA:NA > QLD|Central Coast (eg. Rockhampton)|4700|Rockhampton|Landscaping|[E]',
    ad_group_id: '23055669655',
    keyword__placement: 'landscaping rockhampton',
    keyword_id: '7161478035',
    match_type: 'Exact',
    ad_type: 'text',
    ad_id: '183749976437',
    device: 'Mobile devices with full browsers',
    report_date: '2017-08-23',
    google_click_id: 'EAIaIQobChMItM-J7tvr1QIVCqS9Ch2PlwuLEAAYASAAEgLeF_D_BwE',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
},
{
    account: 'HI:KLMN > AU',
    campaign: 'Locksmiths:29|NA:NA > QLD(Locksmiths)',
    campaign_id: '669180694',
    ad_group: 'Locksmiths:29|NA:NA > QLD|Central Coast (eg. Rockhampton)|4680|Gladstone|Locksmiths|[E]',
    ad_group_id: '33339360429',
    keyword__placement: 'locksmiths gladstone',
    keyword_id: '42664250974',
    match_type: 'Exact',
    ad_type: 'text',
    ad_id: '160464101472',
    device: 'Mobile devices with full browsers',
    report_date: '2017-08-23',
    google_click_id: 'CPHIiNL-69UCFdoHKgodV0IM4Q',
    clicks: '1',
    click_type: 'Phone calls',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
},
{
    account: 'HI:KLMN > AU',
    campaign: 'Landscaping & Gardening:2|NA:NA > QLD(Landscaping)',
    campaign_id: '391031215',
    ad_group: 'Landscaping & Gardening:2|NA:NA > QLD|Brisbane City & North|4000|Brisbane|Landscaping|[B]',
    ad_group_id: '23055635215',
    keyword__placement: '+landscaping +brisbane',
    keyword_id: '29233113812',
    match_type: 'Broad',
    ad_type: 'text',
    ad_id: '183760337904',
    device: 'Computers',
    report_date: '2017-08-23',
    google_click_id: 'Cj0KCQjwz_TMBRD0ARIsADfk7hRVDu5IKLdhTBqH1M3TtOYEGCHlcmAr4n8PL_8Tf-ggHQIGKcgAGcgaAsK-EALw_wcB',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '2',
    top_vs_other: 'Google search: Top',
},
{
    account: 'HI:KLMN > AU',
    campaign: 'Lawn & Turf:84|Laying:945  > QLD(Turf Installers)',
    campaign_id: '396767215',
    ad_group: 'Lawn & Turf:84|Laying:945  > QLD|Brisbane City & North|4000|Brisbane|Turf Installers|[B]',
    ad_group_id: '23426443135',
    keyword__placement: '+turf +installers +brisbane',
    keyword_id: '70018374415',
    match_type: 'Broad',
    ad_type: 'text',
    ad_id: '160444495189',
    device: 'Mobile devices with full browsers',
    report_date: '2017-08-23',
    google_click_id: 'Cj0KEQjwz_TMBRD0jY-RusGilOYBEiQAN-TuFEFzIxFW8m6ZNr0uC9IJceISevWG-7gJYFlXe311vgYaArXD8P8HAQ',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
  },
];

const testObjectClicksResults = [
  {
    line_number: 0,
    app_code: 'HIP',
    source_name: 'Adwords',
    source_account: 'hip',
    report_date: '2017-08-23',
    source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
    account: 'HI:KLMN > AU',
    campaign: 'Landscaping & Gardening:2|NA:NA > QLD(Landscaping)',
    campaign_id: '391031215',
    ad_group: 'Landscaping & Gardening:2|NA:NA > QLD|Central Coast (eg. Rockhampton)|4700|Rockhampton|Landscaping|[E]',
    ad_group_id: '23055669655',
    keyword_id: '7161478035',
    match_type: 'Exact',
    ad_type: 'text',
    ad_id: '183749976437',
    device: 'Mobile devices with full browsers',
    google_click_id: 'EAIaIQobChMItM-J7tvr1QIVCqS9Ch2PlwuLEAAYASAAEgLeF_D_BwE',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
    category: 'Landscaping & Gardening',
    category_id: 2,
    sub_category: '',
    sub_category_id: '',
    state: 'QLD',
    location: 'Rockhampton',
    location_type: 'Suburb',
    adgroup_match: '[E]',
    keyword_match: 'Exact',
    postcode: 4700,
    keyword_placement: 'landscaping rockhampton',
    record_created_date: '2017-08-23 10:30:45',
  },

  {
    line_number: 1,
    app_code: 'HIP',
    source_name: 'Adwords',
    source_account: 'hip',
    report_date: '2017-08-23',
    source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
    account: 'HI:KLMN > AU',
    campaign: 'Locksmiths:29|NA:NA > QLD(Locksmiths)',
    campaign_id: '669180694',
    ad_group: 'Locksmiths:29|NA:NA > QLD|Central Coast (eg. Rockhampton)|4680|Gladstone|Locksmiths|[E]',
    ad_group_id: '33339360429',
    keyword_id: '42664250974',
    match_type: 'Exact',
    ad_type: 'text',
    ad_id: '160464101472',
    device: 'Mobile devices with full browsers',
    google_click_id: 'CPHIiNL-69UCFdoHKgodV0IM4Q',
    clicks: '1',
    click_type: 'Phone calls',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
    category: 'Locksmiths',
    category_id: 29,
    sub_category: '',
    sub_category_id: '',
    state: 'QLD',
    location: 'Gladstone',
    location_type: 'Suburb',
    adgroup_match: '[E]',
    keyword_match: 'Exact',
    postcode: 4680,
    keyword_placement: 'locksmiths gladstone',
    record_created_date: '2017-08-23 10:30:45',
  },
  {
    line_number: 2,
    app_code: 'HIP',
    source_name: 'Adwords',
    source_account: 'hip',
    report_date: '2017-08-23',
    source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
    account: 'HI:KLMN > AU',
    campaign: 'Landscaping & Gardening:2|NA:NA > QLD(Landscaping)',
    campaign_id: '391031215',
    ad_group: 'Landscaping & Gardening:2|NA:NA > QLD|Brisbane City & North|4000|Brisbane|Landscaping|[B]',
    ad_group_id: '23055635215',
    keyword_id: '29233113812',
    match_type: 'Broad',
    ad_type: 'text',
    ad_id: '183760337904',
    device: 'Computers',
    google_click_id: 'Cj0KCQjwz_TMBRD0ARIsADfk7hRVDu5IKLdhTBqH1M3TtOYEGCHlcmAr4n8PL_8Tf-ggHQIGKcgAGcgaAsK-EALw_wcB',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '2',
    top_vs_other: 'Google search: Top',
    category: 'Landscaping & Gardening',
    category_id: 2,
    sub_category: '',
    sub_category_id: '',
    state: 'QLD',
    location: 'Brisbane',
    location_type: 'Suburb',
    adgroup_match: '[B]',
    keyword_match: 'BMM',
    postcode: 4000,
    keyword_placement: '+landscaping +brisbane',
    record_created_date: '2017-08-23 10:30:45',
  },
  {
    line_number: 3,
    app_code: 'HIP',
    source_name: 'Adwords',
    source_account: 'hip',
    report_date: '2017-08-23',
    source_time_zone: '(GMT+10:00) Eastern Time - Melbourne, Sydney',
    account: 'HI:KLMN > AU',
    campaign: 'Lawn & Turf:84|Laying:945  > QLD(Turf Installers)',
    campaign_id: '396767215',
    ad_group: 'Lawn & Turf:84|Laying:945  > QLD|Brisbane City & North|4000|Brisbane|Turf Installers|[B]',
    ad_group_id: '23426443135',
    keyword_id: '70018374415',
    match_type: 'Broad',
    ad_type: 'text',
    ad_id: '160444495189',
    device: 'Mobile devices with full browsers',
    google_click_id: 'Cj0KEQjwz_TMBRD0jY-RusGilOYBEiQAN-TuFEFzIxFW8m6ZNr0uC9IJceISevWG-7gJYFlXe311vgYaArXD8P8HAQ',
    clicks: '1',
    click_type: 'Headline',
    customer_id: '2838733997',
    page: '1',
    top_vs_other: 'Google search: Top',
    category: 'Lawn & Turf',
    category_id: 84,
    sub_category: 'Laying',
    sub_category_id: 945,
    state: 'QLD',
    location: 'Brisbane',
    location_type: 'Suburb',
    adgroup_match: '[B]',
    keyword_match: 'BMM',
    postcode: 4000,
    keyword_placement: '+turf +installers +brisbane',
    record_created_date: '2017-08-23 10:30:45',
  },
];

const adwordsClicksConfig = utilConfig.get('transformers.splitadwordscampaign.test_1');
const batch =  new EtlBatch(testObjectClicks, 1, 1, 'test_clicks');

suite('SplitAdwordsCampaign', () => {
  suite('Simple test:', () => {
    const transf = new SplitAdwordsCampaign(adwordsClicksConfig.fixedFields, adwordsClicksConfig.fieldsRequiringMapping);
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
    test('Test configuration: fieldsRequiringMapping', async () => {
        const fixedFields = transf.getFieldsRequiringMapping();
        fixedFields.must.be.eql({
            keyword_placement: 'keyword__placement',
        });
    });
    test('Test transformation', async () => {
        await transf.transform(batch);
        const batchList = batch.getTransformedRecords();
        batchList[0].getTransformedData().must.be.eql(testObjectClicksResults[0]);
        batchList[1].getTransformedData().must.be.eql(testObjectClicksResults[1]);
        batchList[2].getTransformedData().must.be.eql(testObjectClicksResults[2]);
        batchList[3].getTransformedData().must.be.eql(testObjectClicksResults[3]);
    });
  });
  suite('Test using the plugin to ensure the parameters are passed:', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    const pluginObj = new TransformerPlugin('test_1');
    app.use(pluginObj);
    await app.start();
    const transf = await context.getObjectByName('EtlTransformer');

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
    test('Test configuration: fieldsRequiringMapping', async () => {
        const fixedFields = transf.getFieldsRequiringMapping();
        fixedFields.must.be.eql({
            keyword_placement: 'keyword__placement',
        });
    });
    test('Test transformation', async () => {
        await transf.transform(batch);
        const batchList = batch.getTransformedRecords();
        batchList[0].getTransformedData().must.be.eql(testObjectClicksResults[0]);
        batchList[1].getTransformedData().must.be.eql(testObjectClicksResults[1]);
        batchList[2].getTransformedData().must.be.eql(testObjectClicksResults[2]);
        batchList[3].getTransformedData().must.be.eql(testObjectClicksResults[3]);
    });
  });
});
