import * as moment from 'moment';
export default class  RequestGenerator {
    public reportRequests = [];
    public currentIndex = null;
    public report() {
        this.reportRequests.push({});
        this.currentIndex = this.reportRequests.length - 1;
        return this;
    }

    private static typechecker(type: string, obj: any, func?: string): void {
        if (typeof obj === type) {
           if (func === 'dateRanges' && !moment(new Date(obj)).isValid()) {
               throw new Error(`${func}: Invalid Type. Expected date equal to ${typeof obj}`);
           }
           return;
        }
        throw new Error(`${func}: Invalid Type. Expected ${type} equal to ${typeof obj}`);
    }

    public viewId(id: string) {
        this.reportRequests[this.currentIndex]['viewId'] = `${id}`;
        return this;
    }

    public pageToken(num: number) {
        RequestGenerator.typechecker('number', num, 'pageToken');
        this.reportRequests[this.currentIndex]['pageToken'] = num.toString();
        return this;
    }

    public pageSize(num: number) {
        this.reportRequests[this.currentIndex]['pageSize'] = num;
        return this;
    }

    public addToCurrentIndex(key: string, obj: object) {
        if (!this.reportRequests[this.currentIndex].hasOwnProperty(key)) {
            this.reportRequests[this.currentIndex][key] = [];
        }
        this.reportRequests[this.currentIndex][key].push(obj);
    }

    public dimension(dimensions: string | string[], type = 'name') {
        if (typeof dimensions === 'string') {
            dimensions = dimensions.split(',');
        }
        if (dimensions.length > 9) {
            throw new Error('Dimentsion length exceeded. Max of nine allowed');
        }
        dimensions.map((dimension) => {
            const obj = {};
            obj[type] = dimension;
            this.addToCurrentIndex('dimensions', obj);
        });
        return this;
    }

    public metric(metrics: string | string[], type = 'expression') {
        if (typeof metrics === 'string') {
            metrics = metrics.split(',');
        }
        if (metrics.length > 10) {
            throw new Error('metrics length exceeded. Max of 10 allowed');
        }
        metrics.map((metric) => {
            const obj = {};
            obj[type] = metric;
            this.addToCurrentIndex('metrics', obj);
        });
        return this;
    }

    public filtersExpression(expression: string) {
        RequestGenerator.typechecker('string', expression, 'filtersExpression');
        this.reportRequests[this.currentIndex].filtersExpression = expression;
        return this;
    }

    public includeEmptyRows(inc: boolean) {
        if (inc) {
            this.reportRequests[this.currentIndex]['includeEmptyRows'] = true;
        }
        return this;
    }

    public dateRanges(startDate, endDate) {
        RequestGenerator.typechecker('string', startDate, 'dateRanges');
        RequestGenerator.typechecker('string', endDate, 'dateRanges');
        const dateObj = {startDate, endDate};
        this.addToCurrentIndex('dateRanges', dateObj);
        return this;
    }

    public orderBys(fieldName, sortOrder) {
        if (!this.reportRequests[this.currentIndex]['orderBys']) {
            this.reportRequests[this.currentIndex]['orderBys'] = [];
        }
        if (fieldName.length > 0) {
            const orderObject = {fieldName, sortOrder};
            this.reportRequests[this.currentIndex]['orderBys'].push(orderObject);
        }
        return this;
    }

    public get() {
        const result = {
            reportRequests: this.reportRequests,
        };
        return result;
    }

    public getJson() {
        return JSON.stringify(this.get());
    }
}
