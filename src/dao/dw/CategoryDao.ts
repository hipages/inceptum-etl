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
        return await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => {
            return transaction.query(query)
                .then((rows) => {
                    const categories: Categories<Category> = {};
                    if ((rows !== null && rows.length > 0)) {
                        rows.map((r) => {
                            const cat: Category = { ...r };
                            categories[r['category_seo_key']] = cat;
                        });
                    }
                    return categories;
                });
        });
    }
}
