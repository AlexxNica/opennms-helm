import {ClientDelegate} from './client_delegate';

export class GenericDatasource {

    constructor(instanceSettings, $q, backendSrv, templateSrv) {
        this.type = instanceSettings.type;
        this.url = instanceSettings.url;
        this.name = instanceSettings.name;
        this.q = $q;
        this.backendSrv = backendSrv;
        this.templateSrv = templateSrv;
        this.client = new ClientDelegate(instanceSettings, backendSrv, $q);
    }

    query(options) {
        let N = 10;
        if (options.targets.length > 0 && options.targets[0].N) {
            N = options.targets[0].N;
        }
        let start = options.range.from.valueOf();
        let end = options.range.to.valueOf();
        let step = Math.floor((end - start) / options.maxDataPoints);

        return this.client.getSeriesForTopNApplications(N, start, end, step).then(series => {
            return {
                data: GenericDatasource.toSeries(series)
            };
        });
    }

    testDatasource() {
        return this.client.getClientWithMetadata()
            .then(metadata => {
                if (metadata) {
                    return {
                        status: "success",
                        message: "Data source is working",
                        title: "Success"
                    };
                }
            }).catch(e => {
                if (e.message === "Unsupported Version") {
                    return {
                        status: "danger",
                        message: "The OpenNMS version you are trying to connect to is not supported. " +
                        "OpenNMS Horizon version >= 20.1.0 or OpenNMS Meridian version >= 2017.1.0 is required.",
                        title: e.message
                    }
                } else {
                    throw e;
                }
            });
    }

    annotationQuery(options) {
        return this.q.when([]);
    }

    metricFindQuery(query) {
        return this.q.when([]);
    }

    static toSeries(flowSeries) {
        let start = flowSeries.start.valueOf();
        let end = flowSeries.end.valueOf();
        let labels = flowSeries.labels;
        let columns = flowSeries.columns;
        let timestamps = flowSeries.timestamps;
        let series = [];
        let i, j, nRows, nCols, datapoints;


        // HACK
        let step = timestamps[1] - timestamps[0];

        if (timestamps !== undefined) {
            nRows = timestamps.length;
            nCols = columns.length;

            for (i = 0; i < nCols; i++) {
                datapoints = [];
                for (j = 0; j < nRows; j++) {
                    // Skip rows that are out-of-range
                    if (timestamps[j] < start || timestamps[j] > end) {
                        continue;
                    }

                    // Make the outbounds things negative
                    let multiplier = 1;
                    if (labels[i].indexOf("Out") >= 0) {
                        multiplier = -1;
                    }

                    datapoints.push([columns[i][j] / step * multiplier, timestamps[j]]);
                }

                series.push({
                    target: labels[i],
                    datapoints: datapoints
                });
            }
        }

        console.log("series", series, flowSeries);
        return series;
    }
}
