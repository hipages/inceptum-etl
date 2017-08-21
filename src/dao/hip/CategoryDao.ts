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
        const query = 'SELECT RPS.practice_seo_key, RP.practice_id, RP.practice_parent_id \
                       FROM ref_practice_seo RPS \
                       INNER JOIN ref_practice RP ON RP.practice_id = RPS.practice_seo_practice_id';
        const results = await this.mysqlClient.runInTransaction(
                            true,
                            (transaction: DBTransaction) => transaction.query(query));

        const categories: Categories<Category> = {};
        results.foreach((row) => {
                const cat: Category = { ...row };
                categories[row['practice_seo_key']] = cat;
        });
        return Promise.resolve(categories);
    }
}
