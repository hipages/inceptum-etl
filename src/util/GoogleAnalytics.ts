import * as lodash from 'lodash';
import * as promise from 'bluebird';
import * as google from 'googleapis';
import { LogManager } from 'inceptum';
// Helper function
import { GoogleAnalyticsReporting } from '../sources/GoogleAnalyticsReporting';
import RequestGenerator from './RequestGenerator';

const log = LogManager.getLogger();
// fetch promise from google SDK
promise.promisifyAll(google);

export class GoogleAnalytics  {
    // instance returned by google Auth service
    protected jwtClient;
    // config to establish connection to GA
    protected configGA;
    // View to fetch reporting data from
    public viewId: string;
    // Index to fetch data from Start from 1 and increment to max result.
    // E.G. startIndex = 1 and maxResult = 300. so nexPageToken is the startIndex for next batch = 301 (maxResults + startIndex)
    protected nextPageToken: number;
    // Accept config to establish connection and Options startIndex
    constructor(configGA: object, startIndex?: number) {
        this.viewId = configGA['viewId'];
        this.configGA = {
            client_email: configGA['client_email'],
            private_key: configGA['private_key'].replace(/\\n/g, '\n'),
        };
        this.nextPageToken = startIndex || 1;
    }
    /**
     * Authorise connection using client Email and private key from service account
     * @returns {Promise<any>}
     */
    private async authorize(): Promise<any> {
        try {
            this.jwtClient = await new google.auth.JWT(
                this.configGA.client_email,
                null,
                this.configGA.private_key,
                ['https://www.googleapis.com/auth/analytics.readonly'],
                null,
            );
            // Authorize this connection to make further call
            await this.jwtClient.authorize();
            return Promise.resolve(promise.promisifyAll(google.analyticsreporting('v4')));
        } catch (e) {
            log.fatal(new Error(`Unable to generate Key. Returned message: ${e}`));
            return Promise.reject(  new Error(`Unable to generate Key. Returned message: ${e.message}`));
        }
    }

    public testAuth() {
        return this.authorize();
    }

    /**
     * perform batch get from the Google Analytics V4 API
     * // 50,000 requests per project per day
     * // 10 queries per second (QPS) per IP address
     * // 10,000 requests per view (profile) per day (cannot be increased)
     * // 10 concurrent requests per view (profile) (cannot be increased)
     * @param params
     * @returns {Promise<any>}
     */
    public async fetch(params): Promise<any> {
        try {
            const analytics: google.analyticsreporting = await this.authorize();
            const report: google.analyticsreporting.reports.batchGet = promise.promisify(analytics.reports.batchGet);
            const requestGen = new RequestGenerator();
            const response = await report({
                resource: requestGen
                    .report()
                    .viewId(this.viewId)
                    .dimension(params.dimensions)
                    .metric(params.metrics)
                    .dateRanges(params.dateRanges.startDate, params.dateRanges.endDate)
                    .filtersExpression(params.filters)
                    .pageToken(Number.parseInt(params.nextPageToken || this.nextPageToken))
                    .pageSize(params.maxResults)
                    .includeEmptyRows(params.includeEmptyRows || true)
                    .orderBys(params.orderBys || '', 'ASCENDING')
                    .get(),
                auth: this.jwtClient,
            });
            if (response.reports[0].nextPageToken) {
                this.nextPageToken = response.reports[0].nextPageToken;
            }
            return Promise.resolve(response);
        } catch (e) {
            log.fatal(e);
            return Promise.reject(new Error(`Request Failed with message ${e.message}`));
        }
    }

    public getNextPageToken(): number {
      return this.nextPageToken;
    }

    // tslint:disable-next-line:prefer-function-over-method
    public getObject(theObject, key): any {
        let result = false;
        if (theObject instanceof Array) {
            theObject.forEach( (item) => {
                if (!result) {
                    result = this.getObject(item, key);
                }
            });
        } else {
            Object.keys(theObject).forEach((prop) => {
                if (!result) {
                    if (prop === key) {
                        result = theObject[prop];
                    } else if (theObject[prop] instanceof Object || theObject[prop] instanceof Array) {
                        result = this.getObject(theObject[prop], key);
                    }
                }
            });
        }
        return result;
    }

    // tslint:disable-next-line:prefer-function-over-method
    public mergeHeadersRows(headers: Array<string>, data: Array<object>, injectedFields: any, rowKey: string) {
        const mixed = data.map((item) => {
            let newObject = Object.create(null);
            if (injectedFields) {
                injectedFields.map((field) => newObject = {...newObject, ...field});
            }
            item[rowKey].map((record, index) => {
                const myTypes = ['string', 'number'];
                const recordType = typeof record;
                // tslint:disable-next-line
                if (myTypes.indexOf(recordType) >= 0) {
                    newObject[headers[index].substring(3)] = record;
                } else if (recordType === 'object') {
                    Object.keys(record).map((thisVal) => {
                        record[thisVal].map((myVal, i) => {
                            newObject[headers[i].substring(3)] = myVal;
                        });
                    });
                }
            });
            return newObject;
        });
        return mixed;
    }

    public mergeHeadersDimensions(results) {
        const rows = this.getObject(results, 'rows');

        if (Array.isArray(rows) && (rows.length > 0)) {
            const data = this.mergeHeadersRows(this.getObject(results, 'columnHeader')['dimensions'], rows, [], 'dimensions');
            return data;
        } else {
            log.error(`No records to merge in dimensions and metrics found`);
            return [];
        }
    }

    /**
     *
     * @param results
     * @param injectedFields
     */
    public mergeDimensionsRows(results, injectedFields: any= false) {
        let data = [];
        results.map(
            (recordSet, index) => {
                injectedFields = (index === 0) ? injectedFields : false;
                const rows = this.getObject(recordSet, 'rows');
                if (Array.isArray(rows) && rows.length > 0) {
                    const recordSetWithHeaders = this.mergeHeadersRows(
                        this.getObject(recordSet, 'columnHeader')['dimensions'],
                        rows,
                        injectedFields,
                        'dimensions',
                    ).sort((currentObj, nexObj) => {
                        // Compare by transactionId
                        if (currentObj.transactionId < nexObj.transactionId) {
                            return -1;
                        }
                        if (currentObj.transactionId > nexObj.transactionId) {
                            return 1;
                        }
                        return 0;
                    });
                    // Merge with data based on transactionId. if not present then add new object to array else merge with he object found
                    if (data.length === 0) {
                        data = recordSetWithHeaders;
                        recordSetWithHeaders.map((obj) => {
                            const idIndex = lodash.findIndex(data, (o) => o.transactionId === obj.transactionId);
                            // Only load the first transaction
                            if ( idIndex === -1) {
                                data.push(obj);
                            }
                        });
                    } else {
                        recordSetWithHeaders.map((obj) => {
                            const idIndex = lodash.findIndex(data, (o) => o.transactionId === obj.transactionId);
                            // Only include data for existing record
                            if ( idIndex !== -1) {
                                lodash.assign(data[idIndex], obj);
                            }
                        });
                    }

                } else {
                    log.error(`No records found to merge in dimensions and metrics. index:${index} `);
                }
            },
        );
        return data;
    }

    public mergeDimMetricsRows(results, injectedFields: any= false) {
        const metricHeader = this.getObject(results, 'metricHeaderEntries').reduce((newArry, item) => {
            return newArry.concat(item.name);
        }, []);
        const columnHeader = this.getObject(results, 'columnHeader')['dimensions'];
        const rows = this.getObject(results, 'rows');
        if (Array.isArray(rows) && (rows.length > 0)) {
            const data = this.mergeHeadersRows(columnHeader, rows, injectedFields, 'dimensions');
            const data2 = this.mergeHeadersRows(metricHeader, rows, false, 'metrics');
            return data.reduce((newArray, block, index) => {
                return newArray.concat([{...block, ...data2[index]}]);
            }, []);
        } else {
            log.error(`No records to merge found`);
            return [];
        }
    }

    /**
     * Returns the index in the results where the dimensionKey has the value searchValue
     * or the highest value < searchValue
     *
     * returns the row number where the searchValue or the highest value < searchValue was found
     * returns -1 if the searchValue is bigger than all the values
     * returns 0 if the searchValue is smaller than all the values
     * returns false if the dimensionKey does not exist in the response 'columnHeader'
     */
    public findDimensionKeyRowIndex(results, dimensionKey: string, searchValue: string, substringToNumber = -1): any {
        const data = this.getObject(results, 'rows');
        const headers = this.getObject(results, 'columnHeader')['dimensions'];
        const keyIndex = headers.indexOf(dimensionKey);
        let index = false;
        if ((keyIndex >= 0) && data) {
            const dataIndex = data.findIndex((item) => {
                let isBigger = false;
                if (substringToNumber > -1) {
                    const itemNumber = Number(item['dimensions'][keyIndex].substring(substringToNumber));
                    const searchNumber = Number(searchValue.substring(substringToNumber));
                    isBigger = itemNumber > searchNumber;
                } else {
                    isBigger = (item['dimensions'][keyIndex] > searchValue);
                }
                return (item['dimensions'][keyIndex] === searchValue) || isBigger;
            });
            // dataIndex === -1 if the searchValue is bigger than all the values.
            index = (dataIndex === -1) ? dataIndex : ((data[dataIndex]['dimensions'][keyIndex] === searchValue) ? Number(dataIndex) + 1 : dataIndex);
        }
        return index;
    }
}
