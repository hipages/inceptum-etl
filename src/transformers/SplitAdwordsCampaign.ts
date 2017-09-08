import { LogManager } from 'inceptum';
import * as moment from 'moment';
import { EtlBatch } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';

const log = LogManager.getLogger();

export class SplitAdwordsCampaign extends EtlTransformer {
  private adgroupMatchList = ['[UB]', '(UB)', '(BROAD)', '[OB]', '[B]', '(B)', '[BMM]', '(BMM)', '|BMM|', '[E]', '(E)', '[EXA]', '(EXA)', '|E|', '[P]', '(P)', '|P|'];
  private fixedFields: object;
  private fieldsRequiringMapping: object;

  constructor(fixedFields: object, fieldsRequiringMapping: object) {
      super();
      this.fixedFields = fixedFields || {};
      this.fieldsRequiringMapping = fieldsRequiringMapping || {};
  }

  public getFixedFields(): object {
    return this.fixedFields;
  }

  public getFieldsRequiringMapping(): object {
    return this.fieldsRequiringMapping;
  }

  /**
   * Copy batch records to transform data
   * @param batch
   */
  // tslint:disable-next-line:prefer-function-over-method
  public async transform(batch: EtlBatch): Promise<void> {
    // Replace date in fixed fields
    let fixedFields = {};
    if (this.fixedFields) {
        fixedFields = {...this.fixedFields};
        Object.keys(fixedFields).map((key) => {
            switch (fixedFields[key]) {
                case 'UTC_TIMESTAMP' :   fixedFields[key] = moment.utc().format('YYYY-MM-DD HH:mm:ss');
                                    break;
                case 'UTC_DATE' :   fixedFields[key] = moment.utc().format('YYYY-MM-DD');
                                    break;
                case 'LOCAL_TIMESTAMP': fixedFields[key] = moment().format('YYYY-MM-DD HH:mm:ss');
                                        break;
                case 'LOCAL_DATE':  fixedFields[key] = moment().format('YYYY-MM-DD');
            }
        });
    }

    batch.getRecords().map( (record, index) => {
        const newRecord = {...fixedFields, ...{ line_number: index }, ...record.getData()};

        if (newRecord.hasOwnProperty('ad_group')) {
            const adgroupParts = newRecord['ad_group'].split('|');
            // Get category
            const firstParts = adgroupParts[0].trim().split(':');
            const category = firstParts[0].trim();
            const categoryId = (firstParts.length > 1) ? Number(firstParts[1]) : '';

            // Get the state and sub category
            let state = [];
            let subCategory = '';
            let subCategoryId: Number | string = '';
            if ((adgroupParts.length >= 2) && (adgroupParts[1].indexOf('>') > -1)) {
                state = adgroupParts[1].trim().split('>');
                const subParts = state[0].trim().split(':');
                subCategory = subParts[0].trim();
                subCategoryId = (subParts.length > 1) ? Number(subParts[1]) : '';
            } else if ((adgroupParts.length >= 3) && (adgroupParts[2].indexOf('>') > -1)) {
                state = adgroupParts[1].trim().split('>');
                const subParts = adgroupParts[1].trim().split(':');
                subCategory = subParts[0].trim();
                subCategoryId = (subParts.length > 1) ? Number(subParts[1]) : '';
            }

            if (subCategory === 'NA') {
                subCategory = '';
                subCategoryId = '';
            }

            let locationType = '';
            let recordState = '';
            if (state.length > 1) {
                recordState = state[1].trim();
                locationType = 'State';
            }

            // Get the suburb / location
            let location = '';
            let postcode = '';
            switch (adgroupParts.length) {
                case 5 :
                    location = adgroupParts[2].trim();
                    break;
                case 6 :
                    // this could be the old format or the new themed region campaign.
                    if (adgroupParts[2].trim() === 'Region') {
                        // then it's region themed e.g. Carpenters:19|NA:NA > NSW|Region|Western Sydney|carpenters|[B]
                        location = adgroupParts[3].trim();
                        locationType = 'Region';
                    } else {
                        // else it's the old format e.g. Carpenters:19|Windows:339 > TAS|Hobart|7000|Hobart|[B]
                        location = adgroupParts[4].trim();
                        locationType = 'Suburb';
                        postcode = adgroupParts[3].trim();
                    }
                    break;
                case 7:
                    // this is a suburb themed campaign in format e.g. Carpenters:19|NA:NA > NSW|Sydney CBD|2000|Sydney|carpenters|[B]
                    if (adgroupParts[6] !== '') {
                        location = adgroupParts[4].trim();
                        locationType = 'Suburb';
                        postcode = adgroupParts[3].trim();
                    } else {
                        // Tree Felling:37|Lopping:1091 > NSW|Region|Hawksberry|[B]|Tree Lopping|
                        location = adgroupParts[3].trim();
                        locationType = 'Region';
                    }
                    break;
                case 8:
                    // format: {Windows:16|Whole Window Replacement|1120  > WA|South - West Region (eg. Albany)|6330|Albany|Window Replacement|[E]}
                    if (adgroupParts[7] !== '') {
                        location = adgroupParts[5].trim();
                        locationType = 'Suburb';
                        postcode = adgroupParts[4].trim();
                    } else {
                        // "Tree Felling:37|Lopping:1091 > NSW|Hunter|2337|Glenbawn|[B]|Tree Lopping|
                        location = adgroupParts[4].trim();
                        locationType = 'Region';
                    }
                    break;
                case 9:
                    // "Arborist:47|NA:NA > ACT|ACT|2600|Barton|[E]||Arborists|
                    // format: {Arborist:47|NA:NA > ACT|ACT|2600|Barton|[E]||Arborists|}
                    if ((adgroupParts[6].trim().length === 0) && (adgroupParts[8].trim().length === 0)) {
                        location = adgroupParts[4].trim();
                        locationType = 'Suburb';
                        postcode = adgroupParts[3].trim();
                    }
            }
            const keywordHasPlus = (newRecord.hasOwnProperty('keyword__placement') && newRecord['keyword__placement'].includes('+')) || (newRecord.hasOwnProperty('keyword') && newRecord['keyword'].includes('+'));

            let adgroupMatch = '';
            let foundMatch = false;
            this.adgroupMatchList.map((match) => {
                if (!foundMatch && newRecord['ad_group'].includes(match)) {
                    adgroupMatch = match;
                    foundMatch = true;
                }
            });
            newRecord['category'] = category;
            newRecord['category_id'] = categoryId;
            newRecord['sub_category'] = subCategory;
            newRecord['sub_category_id'] = subCategoryId;
            newRecord['state'] = recordState;
            newRecord['location'] = location;
            newRecord['location_type'] = locationType;
            newRecord['adgroup_match'] = adgroupMatch ;
            newRecord['keyword_match'] = keywordHasPlus ? 'BMM' : (newRecord.hasOwnProperty('match_type') ? newRecord['match_type'] : '');
            newRecord['postcode'] = ((postcode.length > 0) && Number.isInteger(Number.parseInt(postcode))) ? Number.parseInt(postcode) : '';
        }

        if (newRecord['report_cost'] && newRecord['avg_cpc'] && newRecord['max_cpc'] && newRecord['first_page_cpc'] && newRecord['first_position_cpc'] && newRecord['top_of_page_cpc'] && newRecord['currency']) {
            newRecord['report_cost'] = SplitAdwordsCampaign.stringToCurrency(newRecord['report_cost']);
            newRecord['avg_cpc'] = SplitAdwordsCampaign.stringToCurrency(newRecord['avg_cpc']);
            newRecord['max_cpc'] = SplitAdwordsCampaign.stringToCurrency(newRecord['max_cpc']);
            newRecord['first_page_cpc'] = SplitAdwordsCampaign.stringToCurrency(newRecord['first_page_cpc']);
            newRecord['first_position_cpc'] = SplitAdwordsCampaign.stringToCurrency(newRecord['first_position_cpc']);
            newRecord['top_of_page_cpc'] = SplitAdwordsCampaign.stringToCurrency(newRecord['top_of_page_cpc']);
            newRecord['currency'] = SplitAdwordsCampaign.stringToCurrency(newRecord['currency']);
        }

        // Map the required fields
        Object.keys(this.fieldsRequiringMapping).map((destinationField) => {
            const sourceField = this.fieldsRequiringMapping[destinationField];
            if ((destinationField !== sourceField) && newRecord.hasOwnProperty(sourceField)) {
                newRecord[destinationField] = newRecord[sourceField];
                delete newRecord[sourceField];
            } else {
                log.info(`Field not transformed: ${sourceField} to ${destinationField}`);
            }
        });
        record.setTransformedData(newRecord);
    } );
  }

  /**
   * Transforming the string currency to decimal format.
   * THe data needs to be in 6 decimal places - divide by 1000000
   * @param input string format of the value
   */
  private static stringToCurrency(input) {
    try {
        const intInput = parseInt(input, 10);
        if (input === intInput && intInput !== 0) {
            return intInput / 1000000;
        }else {
            return input;
        }
    }catch (exp) {
        return input;
    }
  }
}
