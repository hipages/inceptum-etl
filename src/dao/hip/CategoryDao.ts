import { DBTransaction } from 'inceptum';
import { MysqlDao } from '../MySQLDao';

export interface Category {
    practice_id: number,
    practice_seo_key: string,
    practice_parent_id?: number,
}

export interface Categories<T> {
    [index: string]: T,
    [index: number]: T,
}

export class CategoryDao extends MysqlDao {
    public async getCategories(): Promise<Categories<Category>> {
        const query = 'SELECT LCASE(RPS.practice_seo_key) as practice_seo_key, RP.practice_id, RP.practice_parent_id \
                       FROM ref_practice_seo RPS \
                       INNER JOIN ref_practice RP ON RP.practice_id = RPS.practice_seo_practice_id';
        return await this.mysqlClient.runInTransaction(true, (transaction: DBTransaction) => {
            return transaction.query(query)
                .then((rows) => {
                    const categories: Categories<Category> = {};
                    if ((rows !== null && rows.length > 0)) {
                        rows.map((r) => {
                            const cat: Category = { ...r };
                            categories[r['practice_seo_key']] = cat;
                        });
                    }
                    return categories;
                });
        });
    }
}
