import { suite, test } from 'mocha-typescript';
import { must } from 'must';
import { mapRecord } from '../../src/util/FieldMapper';

@suite
class FieldMapperTest {

    @test 'test mapRecord - source record has more properties than target'() {
        interface SourceRec {
            app_code: string,
            source_name: string,
            sessions: string,
        }

        interface TargetRec {
            app_code: string,
            source_name: string,
            sessions: string,
        }

        const FieldMap: SourceRec =  {
            app_code: 'app_code',
            source_name: 'source_name',
            sessions: 'sessions',
        };

        const sRec: SourceRec = {
            app_code: 'HIP',
            source_name: 'GOOGLE ANALYTICS',
            sessions: '10',
        };

        const tRec: TargetRec = {
            app_code: 'HIP',
            source_name: 'GOOGLE ANALYTICS',
            sessions: '10',
        };

        mapRecord<TargetRec>(sRec, FieldMap).must.be.eql(tRec);
    }

    @test 'test mapRecord - source record has less properties than target'() {
        interface SourceRec {
            app_code: string,
            landingPagePath: string,
            sessions: string,
        }

        interface TargetRec {
            app_code: string,
            sessions: string,
            landing_page_path: string,
            base: string,
        }

        const FieldMap: SourceRec =  {
            app_code: 'app_code',
            landingPagePath: 'landing_page_path',
            sessions: 'sessions',
        };

        const sRec: SourceRec = {
            app_code: 'HIP',
            landingPagePath: '/',
            sessions: '10',
        };

        const tRec: Partial<TargetRec> = {
            app_code: 'HIP',
            sessions: '10',
            landing_page_path: '/',
        };

        mapRecord(sRec, FieldMap).must.be.eql(tRec);
    }
}
