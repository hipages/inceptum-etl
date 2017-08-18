import { DBClient } from 'inceptum';
import { parse as parseUrl } from 'url';
import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch } from '../EtlBatch';
import { CategoryDao, Categories, Category } from '../dao/hip/CategoryDao';
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
    landingContentGroup1: string,
    sessions: number,
    percentNewSessions: number,
    organicSearches: number,
    goal1Completions: number,
    goal15Completions: number,
    pageviews: number,
    record_created_date: string,
}

export interface GaLandingPageOutputData {
    landing: string,
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
    landing_content_group1: string,
    sessions: number,
    percent_new_sessions: number,
    organic_searches: number,
    goal1_completions: number,
    goal15_completions: number,
    pageviews: number,
    record_created_date: string,
}

export class GALandingPages extends EtlTransformer {
    private mysqlClient;
    private categories: Promise<Categories<Category>>;

    private hasCatAfterBase = ['c', 'local_categories', 'find', 'find_v8', 'find_variation', 'photo', 'photos'];
    private photoStyles = ['modern', 'contemporary', 'luxury', 'simple', 'country', 'traditional', 'beautiful', 'low', 'natural'];
    private photoCat = ['kitchens', 'bathrooms', 'gates', 'fences', 'gardens', 'decks', 'pergolas', 'curtains', 'pools', 'exteriors'];
    private photoCatReplace = ['kitchen_renovations', 'bathroom_renovations', 'gates', 'fences', 'garden_designer', 'decking', 'pergola', 'curtains', 'pools_spas', 'exteriors'];

    constructor(mysqlClient: DBClient) {
        super();
        this.mysqlClient = mysqlClient;
    }

    public async transform(batch: EtlBatch): Promise<void> {
        this.fetchCategories();
        batch.getRecords().map((record) => {
            this.transformRecord(record);
        });
    }

    public setCategories(categories: Promise<Categories<Category>>) {
        this.categories = categories;
    }

    public getCategories(): Promise<Categories<Category>> {
        return this.categories;
    }

    public fetchCategories() {
       const dao = new CategoryDao(this.mysqlClient);
       this.setCategories(dao.getCategories());
    }

    /**
     * extract pagae from landing page path
     * @param path
     */
    // tslint:disable-next-line:prefer-function-over-method
    public parsePagePath(path: string): string {
        return parseUrl(path).pathname;
    }

    /**
     * extract base from page
     * /photos/kichens => photos
     * @param page
     */
    // tslint:disable-next-line:prefer-function-over-method
    public extractBaseFromPage(page: string): string {
        let base: string = page;
        if (page === '/') {
            base = 'homepage';
        }

        const matches = page.match('(^\/([^/]*))');
        if (matches && matches.length) {
            const tmp = matches[0].replace(new RegExp('/', 'g'), '');
            if (tmp.length) {
                base = tmp;
            }
        }
        return base;
    }

    public findCategory(page: string, base: string): string {
        let category = '';
        const p = page.toLowerCase();
        if (this.hasCatAfterBase.indexOf(base) > -1 || p.indexOf('find_') > -1) {
            const parts = p.split('/');

            if (parts.length > 2) {
                category = parts[2];
            }

            if (category.length > 0 && ['photo', 'photos'].indexOf(base) > -1) {
                // photo
                if (this.photoStyles.indexOf(category) > -1) {
                    if (parts.length > 3) {
                        const photoP2Index = this.photoCat.indexOf(parts[3]);
                        if (photoP2Index > -1) {
                            category = this.photoCatReplace[photoP2Index];
                        }
                    }
                } else {
                    const categoryIndex = this.photoCat.indexOf(category);
                    if (categoryIndex > -1) {
                        category = this.photoCatReplace[categoryIndex];
                    }
                }
            }
        }
        return category;
    }

    public async transformRecord(record: EtlBatchRecord): Promise<boolean> {
        const transformed = {};
        const input = record.getData();
        const categories = await this.getCategories();

        const page = this.parsePagePath(input['landingPagePath']);
        const base = this.extractBaseFromPage(page);
        const matches = page.match('(\/.*\/){1}');
        const category = this.findCategory(page, base);
        let categoryParentId = 0;
        if (category.length) {
            // find category id
            categoryParentId = categories[category].practice_parent_id;
        }
        transformed['landing'] = input['pages'];
        transformed['page'] = page;
        transformed['base'] = base;
        transformed['category'] = category;
        transformed['category_parent_id'] = categoryParentId;
        transformed['source_account'] = input['source_account'];
        transformed['report_date'] = input['report_date'];
        transformed['medium'] = input['medium'];
        transformed['source'] = input['source'];
        transformed['landing_page_path'] = input['landingPagePath'];
        transformed['device_category'] = input['deviceCategory'];
        transformed['region'] = input['region'];
        transformed['campaign'] = input['campaign'];
        transformed['ad_group'] = input['adGroup'];
        transformed['landing_content_group1'] = input['landingContentGroup1'];
        transformed['sessions'] = input['sessions'];
        transformed['percent_new_sessions'] = input['percentNewSessions'];
        transformed['organic_searches'] = input['organicSearches'];
        transformed['goal1_completions'] = input['goal1Completions'];
        transformed['goal15_completions'] = input['goal15Completions'];
        transformed['pageviews'] = input['pageviews'];
        transformed['record_created_date'] = input['record_created_date'];

        record.setTransformedData(transformed);
        return Promise.resolve(true);
    }
}
