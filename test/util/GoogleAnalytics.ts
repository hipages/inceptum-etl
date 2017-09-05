import { GoogleAnalyticsJobs } from '../../src/sources/GoogleAnalyticsJobs';
import { must } from 'must';
import * as nock from 'nock';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { GoogleAnalytics } from '../../src/util/GoogleAnalytics';

const gaConfig = {
    viewId: '273696',
    client_email: 'da@genuine-esence-222222.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIICXQIBAAKBgQCfG5ULYFU5EfJyoUKsU/3MGj1VuBqgohUP1A4xfilMR7+hQj0A\nSQq7x2+3M/0XSG/SgB3UBW6LpwXGmirTp8uQMft+RSbOIem/Y+CZdNX2iFXFuvR1\nwZL+O5DEBoAOjxIXh6FHqGKcZmBbXlDwVGXlj5Y3g6rcf+BBY5WKJ0rqoQIDAQAB\nAoGAHzdQJK0/yzSkNq1A4YKRFsxHIFxAjSd/rl1Sc49nFto01LSkNzwdaP4WAwGm\nND04Azqzn3d5WtjoHzD8Gg6ft1kLqqixz3dbgwpd4MNxBNzWEAqSmDXoQ6xPyp1d\njXAmDSrAFytu3BBQn3CmFSzV3cB+/BAjQuQ5FRokpDKUygECQQDhM1c7VeeZAXGC\nEsv0z7zFLNO0UnDpd6Ep/xQiebGNmLqo8M7XoWO/q0Rbwh2seUVJL+9nmBWGhOsb\nQ8kYZ49RAkEAtN436iZuBHznJmUOBXbKHHTxiRGyfMBYKMtoMUWASrZhRh2UQrfB\nFue+yMoJv3oNsSQhV8a9vwWKEDf77UzyUQJBAMgZTlEyq26QkcL54K/ORfUNN67p\n8doAqfse400exF0EcBbcoW2HwZH1I/BEMwmlV6MILLjnsXitchnvySceHYECQGgk\nrD1+80pSQSayeWhcBfRswccTEZsTha+3r77vLffXHBurXHsuI1h1CD3FV+eQ9+FP\n1IMeRJOBNQYxtjXlYIECQQC8ej7LjzfHMHADVeqKIApqboW614RKzdE69Yp/Ec3W\nU/2iEKs6dFKjNAKs4xxnQbL3mwck2n7/YaXb+X6s44b/\n-----END RSA PRIVATE KEY-----\n',
};


const testObject = {
    reports: [
        {
            columnHeader: {
                dimensions: [
                    'ga:transactionId',
                    'ga:browser',
                    'ga:deviceCategory',
                    'ga:browserVersion',
                    'ga:browserSize',
                    'ga:adMatchedQuery',
                ],
                metricHeader: {
                    metricHeaderEntries: [
                        {
                            name: 'ga:transactions',
                            type: 'INTEGER',
                        },
                    ],
                },
            },
            data: {
                rows: [
                    {
                        dimensions: [
                            'JOB3649837',
                            'Chrome',
                            'tablet',
                            '59.0.3071.125',
                            '1100x1290',
                            '(not set)',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                    {
                        dimensions: [
                            'JOB3664260',
                            'Chrome',
                            'mobile',
                            '49.0.2623.91',
                            '360x560',
                            '(not set)',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                    {
                        dimensions: [
                            'JOB3670766',
                            'Chrome',
                            'mobile',
                            '59.0.3071.125',
                            '380x560',
                            'hipages',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                ],
                totals: [
                    {
                        values: [
                            '3882',
                        ],
                    },
                ],
                rowCount: 3849,
                minimums: [
                    {
                        values: [
                            '1',
                        ],
                    },
                ],
                maximums: [
                    {
                        values: [
                            '5',
                        ],
                    },
                ],
                isDataGolden: true,
            },
            nextPageToken: 1000,
        },
    ],
};
const testObject1 = {
    reports: [
        {
            columnHeader: {
                dimensions: [
                    'ga:transactionId',
                    'ga:campaign',
                    'ga:adGroup',
                    'ga:source',
                    'ga:medium',
                    'ga:keyword',
                ],
                metricHeader: {
                    metricHeaderEntries: [
                        {
                            name: 'ga:transactions',
                            type: 'INTEGER',
                        },
                    ],
                },
            },
            data: {
                rows: [
                    {
                        dimensions: [
                            'JOB3649837',
                            'Campaign1',
                            'adGroup1',
                            'Adclick',
                            'website',
                            'tradie',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                    {
                        dimensions: [
                            'JOB3664260',
                            'Campaign1',
                            'adGroup1',
                            'Adclick',
                            'website',
                            'tradie',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                    {
                        dimensions: [
                            'JOB3670766',
                            'Campaign1',
                            'adGroup1',
                            'Adclick',
                            'website',
                            'tradie',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                ],
                totals: [
                    {
                        values: [
                            '3882',
                        ],
                    },
                ],
                rowCount: 3849,
                minimums: [
                    {
                        values: [
                            '1',
                        ],
                    },
                ],
                maximums: [
                    {
                        values: [
                            '5',
                        ],
                    },
                ],
                isDataGolden: true,
            },
            nextPageToken: 1000,
        },
    ],
};
const testObject2 = {
    reports: [
        {
            columnHeader: {
                dimensions: [
                    'ga:transactionId',
                    'ga:dimension15',
                ],
                metricHeader: {
                    metricHeaderEntries: [
                        {
                            name: 'ga:transactions',
                            type: 'INTEGER',
                        },
                    ],
                },
            },
            data: {
                rows: [
                    {
                        dimensions: [
                            'JOB3649837',
                            'cjkanva39814639251fnkdscwwikr1nkdc23ufn',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                    {
                        dimensions: [
                            'JOB3664260',
                            'Ch131jfajc1yur2y12qjccmnasc',
                        ],
                        metrics: [
                            {
                                values: [
                                    '1',
                                ],
                            },
                        ],
                    },
                ],
                totals: [
                    {
                        values: [
                            '3882',
                        ],
                    },
                ],
                rowCount: 3849,
                minimums: [
                    {
                        values: [
                            '1',
                        ],
                    },
                ],
                maximums: [
                    {
                        values: [
                            '5',
                        ],
                    },
                ],
                isDataGolden: true,
            },
            nextPageToken: 1000,
        },
    ],
};
const dataMix = [
                {
                    transactionId: 'JOB3649837',
                    browser: 'Chrome',
                    deviceCategory: 'tablet',
                    browserVersion: '59.0.3071.125',
                    browserSize: '1100x1290',
                    adMatchedQuery: '(not set)',
                },
                {
                    transactionId: 'JOB3664260',
                    browser: 'Chrome',
                    deviceCategory: 'mobile',
                    browserVersion: '49.0.2623.91',
                    browserSize: '360x560',
                    adMatchedQuery: '(not set)',
                },
                {
                    transactionId: 'JOB3670766',
                    browser: 'Chrome',
                    deviceCategory: 'mobile',
                    browserVersion: '59.0.3071.125',
                    browserSize: '380x560',
                    adMatchedQuery: 'hipages',
                },
            ];
const metricHeaderEntries = {
    transactions: '1'
};
const injectedFields = [ {firstValue: 'value'}, {secondValue: 'second'} ];

suite('GoogleAnalytics', () => {
    suite('GoogleAnalytics API methods', () => {
        const googleAuth = nock('https://accounts.google.com')
            .post('/o/oauth2/token')
            .times(2)
            .reply(200, { access_token: 'ya29.ElmqBEzhpPi4uG9J89plhw7jw1eoqmqPRkCqgOuxjLcBKGKkWIHNxXAsjvqfNCg2HleabPXSbk5NSsaMB6zS2PkTYoGxJ4J6adc74Mhcln8w3axMOCZVvQwlSg',
                token_type: 'Bearer',
                expiry_date: 1503015873000,
                refresh_token: 'jwt-placeholder',
            });
        const GoogleAnalyticsBatchGet = nock('https://analyticsreporting.googleapis.com')
            .post('/v4/reports:batchGet')
            .socketDelay(2000)
            .reply(200, testObject);
        const gaClient = new GoogleAnalytics(gaConfig, 1000);
        test('Test request jwt token', async () => {
            const analytics = await gaClient.testAuth();
            analytics.must.have.property('reports');
        });
        test('Test request error when generating jwt token using wrong key', async () => {
            const wrongConfig = gaConfig;
            wrongConfig.client_email = 'da@test.gserviceaccount.com';
            wrongConfig.private_key = '--VATE KEY-----MIICXQIBAAKBgQCfG5ULYFU5EfJyoUKsU/3MGj1VuBqgohUP1A4xb/\n-----END RSA PRIVATE KEY-----\n';
            const wrongGaClient = new GoogleAnalytics(wrongConfig, 1000);
            try {
                await wrongGaClient.testAuth();
            } catch (e) {
                e.must.throw();
            }
        });
    });
    suite('GoogleAnalytics test public methods', () => {
        const googleAuth = nock('https://accounts.google.com')
            .post('/o/oauth2/token')
            .times(2)
            .reply(200, { access_token: 'ya29.ElmqBEzhpPi4uG9J89plhw7jw1eoqmqPRkCqgOuxjLcBKGKkWIHNxXAsjvqfNCg2HleabPXSbk5NSsaMB6zS2PkTYoGxJ4J6adc74Mhcln8w3axMOCZVvQwlSg',
                token_type: 'Bearer',
                expiry_date: 1503015873000,
                refresh_token: 'jwt-placeholder',
            });
        const GoogleAnalyticsBatchGet = nock('https://analyticsreporting.googleapis.com')
            .post('/v4/reports:batchGet')
            .socketDelay(2000)
            .reply(200, testObject);
        const gaClient = new GoogleAnalytics(gaConfig, 1000);
        test('Test request analytic data', async () => {
            const analyticData = await gaClient.fetch({
                dimensions: 'ga:transactionId,ga:campaign,ga:adGroup,ga:source,ga:medium,ga:keyword,ga:landingPagePath,ga:adMatchedQuery,ga:deviceCategory',
                metrics: 'ga:transactions',
                    dateRanges: {
                    startDate: '2017-08-12',
                    endDate: '2017-08-11',
                },
                filters: 'ga:transactionId=~^JOB*',
                maxResults: 10,
                nextPageToken: 1,
            });
            analyticData.must.have.property('reports');
        });
        test('Test create params', async () => {
            gaClient.viewId.must.be.equal('273696');
            gaClient.getNextPageToken().must.be.equal(1000);
        });
        test('Test create params', async () => {
            gaClient.viewId.must.be.equal('273696');
            gaClient.getNextPageToken().must.be.equal(1000);
        });
        test('Test getObject: key does not exist', async () => {
            const found = gaClient.getObject(testObject, 'no_exist_key');
            found.must.be.false();
        });
        test('Test getObject: key exist', async () => {
            const found = gaClient.getObject(testObject, 'columnHeader');
            found.must.be.eql(testObject.reports[0].columnHeader);
        });
        test('Test getObject: nextPageToken', async () => {
            const found = gaClient.getObject(testObject, 'nextPageToken');
            found.must.be.equal(1000);
        });
        test('Test getObject: rows', async () => {
            const found = gaClient.getObject(testObject, 'rows');
            found.must.be.eql(testObject.reports[0].data.rows);
        });
        test('Test mergeHeadersRows', async () => {
            const data = gaClient.mergeHeadersRows(gaClient.getObject(testObject, 'columnHeader')['dimensions'], gaClient.getObject(testObject, 'rows'), false, 'dimensions');
            data.must.be.eql(dataMix);
        });
        test('Test mergeHeadersRows and injectedFields', async () => {
            const data = gaClient.mergeHeadersRows(gaClient.getObject(testObject, 'columnHeader')['dimensions'], gaClient.getObject(testObject, 'rows'), injectedFields, 'dimensions');
            const [a, b, c] = dataMix;
            const [x, y] = injectedFields;
            data.must.be.eql([{...x, ...y, ...a}, {...x, ...y, ...b}, {...x, ...y, ...c}]);
        });
        test('Test mergeHeadersRows and injectedFields with object as value', async () => {
            const t = {
                reports: [
                    {
                        columnHeader: {
                            dimensions: [
                                'ga:transactionId',
                                'ga:browser',
                                'ga:deviceCategory',
                                'ga:browserVersion',
                                'ga:browserSize',
                                'ga:adMatchedQuery',
                            ],
                            metricHeader: {
                                metricHeaderEntries: [
                                    {
                                        name: 'ga:transactions',
                                        type: 'INTEGER',
                                    },
                                ],
                            },
                        },
                        data: {
                            rows: [
                                {
                                    dimensions: [{
                                        dimensions: [
                                            'JOB3649837',
                                            'Chrome',
                                            'tablet',
                                            '59.0.3071.125',
                                            '1100x1290',
                                            '(not set)',
                                        ],
                                    }],
                                    metrics: [
                                        {
                                            values: [
                                                '1',
                                            ],
                                        },
                                    ],
                                },
                            ],
                            totals: [
                                {
                                    values: [
                                        '3882',
                                    ],
                                },
                            ],
                            rowCount: 3849,
                            minimums: [
                                {
                                    values: [
                                        '1',
                                    ],
                                },
                            ],
                            maximums: [
                                {
                                    values: [
                                        '5',
                                    ],
                                },
                            ],
                            isDataGolden: true,
                        },
                        nextPageToken: 1000,
                    },
                ],
            };
            const data = gaClient.mergeHeadersRows(gaClient.getObject(t, 'columnHeader')['dimensions'], gaClient.getObject(t, 'rows'), injectedFields, 'dimensions');
            const [a, b, c] = dataMix;
            const [x, y] = injectedFields;
            data.must.be.eql([{...x, ...y, ...a}]);
        });
        test('Test mergeDimensionsRows1', async () => {
            const results = [testObject, testObject1, testObject2];
            const data = gaClient.mergeDimensionsRows1(results, injectedFields);
            data.must.be.an.array();
            data.must.have.length(3);
        });
        test('Test mergeDimMetricsRows and injectedFields', async () => {
            const data = gaClient.mergeDimMetricsRows(testObject, injectedFields);
            const [a, b, c] = dataMix;
            const [x, y] = injectedFields;
            data.must.be.eql([{...x, ...y, ...a, ...metricHeaderEntries}, {...x, ...y, ...b, ...metricHeaderEntries}, {...x, ...y, ...c, ...metricHeaderEntries}]);
        });
    });
});
