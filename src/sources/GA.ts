import * as promise from 'bluebird';
import * as google from 'googleapis';
import { LogManager } from 'inceptum';
// Helper function
import RequestGenerator from './RequestGenerator';

const log = LogManager.getLogger();
// fetch promise from google SDK
promise.promisifyAll(google);
export class GA  {
    // instance returned by google Auth service
    private jwtClient;
    // config to establish connection to GA
    private configGA;
    // Instance of request generator for GA
    private requestGen;
    // View to fetch reporting data from
    private viewId: string;
    // Index to fetch data from Start from 1 and increment to max result.
    // E.G. startIndex = 1 and maxResult = 300. so nexPageToken is the startIndex for next batch = 301 (maxResults + startIndex)
    private nextPageToken: number;
    // Accept config to establish connection and Options startIndex
    constructor(configGA: object, startIndex?: number) {
        this.viewId = configGA['viewId'];
        this.configGA = {
            client_email: configGA['client_email'],
            private_key: configGA['private_key'],
        };
        this.nextPageToken = startIndex || 1;
        this.requestGen = new RequestGenerator();
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
            return Promise.reject(new Error(`Unable to generate Key. Returned message: ${e.message}`));
        }
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
            const analytics = await this.authorize();
            const report = promise.promisify(analytics.reports.batchGet);
            const response = await report({
                resource: this.requestGen
                    .report()
                    .viewId(this.viewId)
                    .dimension(params.dimensions)
                    .metric(params.metrics)
                    .dateRanges(params.dateRanges.startDate, params.dateRanges.endDate)
                    .filtersExpression(params.filtersExpression)
                    .pageToken(this.nextPageToken)
                    .pageSize(params.maxResults)
                    // .orderBys('ga:sessionDuration', 'DESCENDING')
                    .get(),
                auth: this.jwtClient,
            });
            this.nextPageToken = response.nextPageToken;
            return Promise.resolve(JSON.stringify(response, null, 4));

        } catch (e) {
            log.fatal(e);
            return Promise.reject(new Error(`Request Failed with message ${e.message}`));
        }
    }
}

