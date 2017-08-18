import { LogManager } from 'inceptum';
import { DBClient } from 'inceptum';
import { parse as parseUrl } from 'url';
import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';
import { CategoryDao, Categories, Category } from '../dao/hip/CategoryDao';

const log = LogManager.getLogger();

export class GALandingPages extends EtlTransformer {
    private mysqlClient;
    private categories: Categories<Category>;
    private fieldsMapping: object;

    private hasCatAfterBase = ['c', 'local_categories', 'find', 'find_v8', 'find_variation', 'photo', 'photos'];
    private photoStyles = ['modern', 'contemporary', 'luxury', 'simple', 'country', 'traditional', 'beautiful', 'low', 'natural'];
    private photoCat = ['kitchens', 'bathrooms', 'gates', 'fences', 'gardens', 'decks', 'pergolas', 'curtains', 'pools', 'exteriors'];
    private photoCatReplace = ['kitchen_renovations', 'bathroom_renovations', 'gates', 'fences', 'garden_designer', 'decking', 'pergola', 'curtains', 'pools_spas', 'exteriors'];

    constructor(mysqlClient: DBClient, fieldsMapping: object) {
        super();
        this.mysqlClient = mysqlClient;
         // fieldsMapping: should have the mapping of fields name { destination: source } in the required order.
         this.fieldsMapping = fieldsMapping;
    }

    public async transform(batch: EtlBatch): Promise<void> {
        await this.fetchCategories();
        batch.getRecords().map((record) => {
            this.transformRecord(record);
        });
    }

    public setCategories(categories: Categories<Category>) {
        this.categories = categories;
    }

    public getCategories(): Categories<Category> {
        return this.categories;
    }

    public async fetchCategories() {
        if (!this.categories) {
            const dao = new CategoryDao(this.mysqlClient);
            this.setCategories(await dao.getCategories());
        }
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

    public transformRecord(record: EtlBatchRecord) {
        const transformedData = {};
        const input = record.getData();
        const categories = this.getCategories();

        const page = this.parsePagePath(input['landingPagePath']);
        const base = this.extractBaseFromPage(page);
        const matches = page.match('(\/.*\/){1}');
        const category = this.findCategory(page, base);
        let categoryParentId = 0;
        // find category id
        if (category.length && categories.hasOwnProperty(category)) {
            categoryParentId = categories[category].practice_parent_id;
        }

        const transformations = {
            page,
            base,
            category,
            category_parent_id: categoryParentId,
        };

        // Map the fields
        let errorFound = false;
        Object.keys(this.fieldsMapping).map((destinationField) => {
            const sourceField = this.fieldsMapping[destinationField];
            if (input.hasOwnProperty(sourceField) || transformations.hasOwnProperty(sourceField)) {
                transformedData[destinationField] = input.hasOwnProperty(sourceField) ? input[sourceField] : transformations[sourceField];
            } else {
                log.info(`Field not transformed: ${sourceField} to ${destinationField}`);
                errorFound = true;
            }
        });

        record.setTransformedData(transformedData);
        if (errorFound) {
            record.setState(EtlState.ERROR);
        }
    }
}
