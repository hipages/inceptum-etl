import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { GoogleAnalytics } from '../../src/util/GoogleAnalytics';

const gaConfig = {
    viewId: '12345',
    client_email: 'tes@email.com',
    private_key: 'my_key',
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
            nextPageToken: 301,
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

const injectedFields = [ {firstValue: 'value'}, {secondValue: 'second'} ];

suite('GoogleAnalytics', () => {

  suite('GoogleAnalytics test public methods', () => {
    const gaClient = new GoogleAnalytics(gaConfig, 1000);
    test('Test create params', async () => {
      gaClient.viewId.must.be.equal('12345');
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
      found.must.be.equal(301);
    });
    test('Test getObject: rows', async () => {
      const found = gaClient.getObject(testObject, 'rows');
      found.must.be.eql(testObject.reports[0].data.rows);
    });
    test('Test mergeHeadersRows', async () => {
      const data = gaClient.mergeHeadersRows(gaClient.getObject(testObject, 'columnHeader')['dimensions'], gaClient.getObject(testObject, 'rows'));
      data.must.be.eql(dataMix);
    });
    test('Test mergeHeadersRows and injectedFields', async () => {
      const data = gaClient.mergeHeadersRows(gaClient.getObject(testObject, 'columnHeader')['dimensions'], gaClient.getObject(testObject, 'rows'), injectedFields);
      const [a, b, c] = dataMix;
      const [x, y] = injectedFields;
      data.must.be.eql([{...x, ...y, ...a}, {...x, ...y, ...b}, {...x, ...y, ...c}]);
    });
  });

});
