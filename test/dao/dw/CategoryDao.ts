import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import * as sinon from 'sinon';
import { DBClient, DBTransaction } from 'inceptum';
import { CategoryDao, Category, Categories } from '../../../src/dao/dw/CategoryDao';

class TestDBClient extends DBClient {
    public runInTransaction(readonly: boolean, func: (transaction: DBTransaction) => Promise<any>): Promise<any> {
        return Promise.resolve(123);
    }
}

@suite class CategoryDaoTestDW {

    @test async testGetCategoriesDW() {
        const results = [
            {
                category_id: 123,
                category_seo_key: 'plumbers',
                parent_category_id: 1,
            },
            {
                category_id: 123,
                category_seo_key: 'garden_designer',
                parent_category_id: 1,
            },
        ];
        const expectedCategories: Categories<Category> = {
            plumbers: {
                category_id: 123,
                category_seo_key: 'plumbers',
                parent_category_id: 1,
            },
            garden_designer: {
                category_id: 123,
                category_seo_key: 'garden_designer',
                parent_category_id: 1,
            },
        };

        const mysqlClient = sinon.createStubInstance(TestDBClient);
        mysqlClient.runInTransaction.returns(results);
        const categoryDao = new CategoryDao(mysqlClient);
        const categories = await categoryDao.getCategories();
        categories.must.be.eql(expectedCategories);
    }

}

