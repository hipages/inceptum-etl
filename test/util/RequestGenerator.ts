import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import RequestGenerator from '../../src/util/RequestGenerator';
// Generating request for GA
const response = (params, requestGen) => requestGen
    .report()
    .viewId(params.viewId)
    .dimension(params.dimensions)
    .metric(params.metrics)
    .dateRanges(params.dateRanges.startDate, params.dateRanges.endDate)
    .filtersExpression(params.filters)
    .pageToken(params.nextPageToken)
    .pageSize(params.maxResults)
    // .orderBys('ga:sessionDuration', 'DESCENDING')
    .get();
suite('RequestGenerator', () => {
    suite('Valid request with 9 dimensions', () => {
        test('Test all attributes are present', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    metrics: 'ga:transactions',
                    dateRanges: {
                        startDate: '2017-08-11',
                        endDate: '2017-08-12',
                    },
                    filters: 'ga:transactionId=~^JOB*',
                    nextPageToken: 1,
                    maxResults: 4,
                }, new RequestGenerator());
                thisResponse.must.have.property('reportRequests');
                thisResponse.reportRequests[0].must.have.property('viewId');
                thisResponse.reportRequests[0].must.have.property('dimensions');
                thisResponse.reportRequests[0].must.have.property('metrics');
                thisResponse.reportRequests[0].must.have.property('dateRanges');
                thisResponse.reportRequests[0].must.have.property('filtersExpression', 'ga:transactionId=~^JOB*');
                thisResponse.reportRequests[0].must.have.property('pageToken', 1);
                thisResponse.reportRequests[0].must.have.property('pageSize', 4);
            } catch (e) {
                // tslint:disable-next-line:no-console
                // console.log(e);
            }
        });
    });
    suite('Invalid request with more than 9 dimensions', () => {
        test('Test more than 9 dimentions', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory,ga:extraField',
                    metrics: 'ga:transactions',
                    dateRanges: {
                        startDate: '2017-08-11',
                        endDate: '2017-08-12',
                    },
                    filters: 'ga:transactionId=~^JOB*',
                    nextPageToken: 1,
                    maxResults: 4,
                }, new RequestGenerator());
            } catch (e) {
                e.must.be.an.error('Dimentsion length exceeded. Max of nine allowed')
            }
        });
    });
    suite('In valid request with more than 10 metrics', () => {
        test('Test more than 10 metrics', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    metrics: 'ga:transactions,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    dateRanges: {
                        startDate: '2017-08-11',
                        endDate: '2017-08-12',
                    },
                    filters: 'ga:transactionId=~^JOB*',
                    nextPageToken: 1,
                    maxResults: 4,
                }, new RequestGenerator());
            } catch (e) {
                e.must.be.an.error('metrics length exceeded. Max of 10 allowed')
            }
        });
    });
    suite('Invalid input for pageToken', () => {
        test('Test for pageToken as string', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    metrics: 'ga:transactions',
                    dateRanges: {
                        startDate: '2017-08-11',
                        endDate: '2017-08-12',
                    },
                    filters: 'ga:transactionId=~^JOB*',
                    nextPageToken: '1',
                    maxResults: 4,
                }, new RequestGenerator());

            } catch (e) {
                e.must.be.an.error('pageToken: Invalid Type. Expected number equal to string');
            }
        });
    });
    suite('Invalid input for filtersExpression', () => {
        test('Test for filtersExpression as an integer', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    metrics: 'ga:transactions',
                    dateRanges: {
                        startDate: '2017-08-11',
                        endDate: '2017-08-12',
                    },
                    filters: 1234,
                    nextPageToken: '1',
                    maxResults: 4,
                }, new RequestGenerator());
            } catch (e) {
                e.must.be.an.error('filtersExpression: Invalid Type. Expected string equal to number');
            }
        });
    });
    suite('Invalid input for dateRanges', () => {
        test('Test for dateRanges as no date', async () => {
            try {
                const thisResponse = await response({
                    viewId: '204562',
                    dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                    metrics: 'ga:transactions',
                    dateRanges: {
                        startDate: 'This is just a string',
                        endDate: 12345,
                    },
                    filters: 'ga:transactionId=~^JOB*',
                    nextPageToken: '1',
                    maxResults: 4,
                }, new RequestGenerator());
            } catch (e) {
                e.must.be.an.error('dateRanges: Invalid Type. Expected date equal to string');
            }
        });
    });
});
