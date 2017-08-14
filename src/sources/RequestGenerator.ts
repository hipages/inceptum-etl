export default class  RequestGenerator {
    private reportRequests = [];
    private currentIndex = null;
    public report() {
        this.reportRequests.push({});
        this.currentIndex = this.reportRequests.length - 1;
        return this;
    }

    private viewId(id: string) {
        this.reportRequests[this.currentIndex]['viewId'] = `${id}`;
        return this;
    }

    private pageToken(num: number) {
        this.reportRequests[this.currentIndex]['pageToken'] = num.toString();
        return this;
    }

    private pageSize(num: number) {
        this.reportRequests[this.currentIndex]['pageSize'] = num;
        return this;
    }

    private addToCurrentIndex(key: string, obj: object) {
        if (!this.reportRequests[this.currentIndex].hasOwnProperty(key)) {
            this.reportRequests[this.currentIndex][key] = [];
        }
        this.reportRequests[this.currentIndex][key].push(obj);
    }

    private dimension(dimensions: string | string[], type = 'name') {
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

    private metric(metrics: string | string[], type = 'expression') {
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

    private filtersExpression(expression: string) {
        this.reportRequests[this.currentIndex].filtersExpression = expression;
        return this;
    }

    private dateRanges(startDate, endDate) {
        const dateObj = {startDate, endDate};
        this.addToCurrentIndex('dateRanges', dateObj);
        return this;
    }

    private orderBys(fieldName, sortOrder) {
        if (!this.reportRequests[this.currentIndex].orderBys) {
            this.reportRequests[this.currentIndex].orderBys = [];
        }
        const orderObject = {fieldName, sortOrder};
        this.reportRequests[this.currentIndex].orderBys.push(orderObject);

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
