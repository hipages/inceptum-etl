import { DBTransaction } from 'inceptum';
import { MysqlDao } from '../MySQLDao';

export interface Category {
    category_id: number,
    category_seo_key: string,
    parent_category_id?: number,
}

export interface Categories<T> {
    [index: string]: T,
    [index: number]: T,
}

export class CategoryDao extends MysqlDao {
    public async getCategories(): Promise<Categories<Category>> {
        const query = 'SELECT LCASE(category_seo_key) as category_seo_key, category_id, parent_category_id \
                       FROM dim_category ';
        try {
            const results = await this.mysqlClient.runInTransaction(
                true,
                (transaction: DBTransaction<any>) => transaction.query(query));

            const categories: Categories<Category> = {};
            if ((results !== null && results.length > 0)) {
                results.map((r) => {
                    const cat: Category = { ...r };
                    categories[r['category_seo_key']] = cat;
                });
                return Promise.resolve(categories);
            }
        } catch (e) {
            return Promise.reject(e);
        }
    }
}
