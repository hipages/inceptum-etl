import { EtlBatch } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';

export class SplitAdwordsCampaign extends EtlTransformer {
  /**
   * Copy batch records to transform data
   * @param batch
   */
  // tslint:disable-next-line:prefer-function-over-method
  public async transform(batch: EtlBatch): Promise<void> {
    batch.getRecords().map( (record) => {
        const newRecord = {...record.getData()};
        if (newRecord.hasOwnProperty('Adgroup')) {
            const adgroupParts = newRecord['Adgroup'].split('|');
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
                state = adgroupParts[1].trim().split('2');
                const subParts = adgroupParts[1].trim().split(':');
                subCategory = subParts[0].trim();
                subCategoryId = (subParts.length > 1) ? Number(subParts[1]) : '';
            }
            if (subCategory === 'NA') {
                subCategory = '';
                subCategoryId = '';
            }

            let locationType = '';
            if (state.length >= 1) {
                state = state[1].trim();
                locationType = 'State';
            }

            // Get the suburb / location
            let location = '';
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
                    }
                    break;
                case 7:
                    // this is a suburb themed campaign in format e.g. Carpenters:19|NA:NA > NSW|Sydney CBD|2000|Sydney|carpenters|[B]
                    if (adgroupParts[6] !== '') {
                        location = adgroupParts[4].trim();
                        locationType = 'Suburb';
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
                    }
            }
            newRecord['category'] = category;
            newRecord['category_id'] = categoryId;
            newRecord['sub_category'] = subCategory;
            newRecord['sub_category_id'] = subCategoryId;
            newRecord['state'] = state;
            newRecord['location'] = location;
            newRecord['location_type'] = locationType;
        }
        record.setTransformedData(newRecord);
    } );
  }
}
