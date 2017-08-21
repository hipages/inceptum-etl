import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import * as sinon from 'sinon';
import { DBClient, DBTransaction } from 'inceptum';
import { CategoryDao, Category, Categories } from '../../../src/dao/hip/CategoryDao';

class TestDBClient extends DBClient {
    public runInTransaction(readonly: boolean, func: (transaction: DBTransaction) => Promise<any>): Promise<any> {
        return Promise.resolve(123);
    }
}

@suite class CategoryDaoTest {

    @test async testGetCategories() {
        const results = [
            {
                practice_seo_key: 'plumbers',
                practice_id: 123,
                practice_parent_id: 1,
            },
            {
                practice_seo_key: 'garden_designer',
                practice_id: 456,
                practice_parent_id: 2,
            },
        ];
        const expectedCategories: Categories<Category> = {
            plumbers: {
                practice_seo_key: 'plumbers',
                practice_id: 123,
                practice_parent_id: 1,
            },
            garden_designer: {
                practice_seo_key: 'garden_designer',
                practice_id: 456,
                practice_parent_id: 2,
            },
        };

        const mysqlClient = sinon.createStubInstance(TestDBClient);
        mysqlClient.runInTransaction.returns(results);

        const categoryDao = new CategoryDao(mysqlClient);
        const categories = await categoryDao.getCategories();
        categories.must.be.eql(expectedCategories);
    }

}

