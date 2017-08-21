import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import * as sinon from 'sinon';
import { DBClient } from 'inceptum';
import { CategoryDao, Category, Categories } from '../../../src/dao/hip/CategoryDao';


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

        //const mc = {runInTransaction: () => results};
        //const mysqlClient = sinon.stub(mc, 'runInTransaction').withArgs().returns(results);
        //mysqlClient.runInTransaction().must.be.eql(results);
        // const categoryDao = new CategoryDao(mysqlClient);
        // const categories = await categoryDao.getCategories();
        // categories.must.be.eql(expectedCategories);
    }

}

