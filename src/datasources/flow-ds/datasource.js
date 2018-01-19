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
        let self = this;
        let N = 10;
        if (options.targets.length > 0 && options.targets[0].N) {
            N = options.targets[0].N;
        }
        let start = options.range.from.valueOf();
        let end = options.range.to.valueOf();
        let step = Math.floor((end - start) / options.maxDataPoints);
        let nodeCriteria = this.templateSrv.replace(options.targets[0].nodeCriteria);
        let interfaceId = this.templateSrv.replace(options.targets[0].interfaceId);

        return this.client.getSeriesForTopNApplications(N, start, end, step, true, nodeCriteria, interfaceId).then(series => {
            return {
                data: self.toSeries(series, options)
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

    // Used by template queries
    metricFindQuery(query) {
        if (query === null || query === undefined || query === "") {
            return this.$q.resolve([]);
        }
        query = this.templateSrv.replace(query);

        let nodeFilterRegex = /nodesWithFlows\((.*)\)/;
        let nodeResourcesRegex = /interfacesOnNodeWithFlows\((.*)\)/;

        var nodeFilterQuery = query.match(nodeFilterRegex);
        if (nodeFilterQuery) {
            return this.metricFindNodeFilterQuery(nodeFilterQuery[1]);
        }

        var nodeCriteria = query.match(nodeResourcesRegex);
        if (nodeCriteria) {
            return this.metricFindNodeResourceQuery(nodeCriteria[1]);
        }

        return this.$q.resolve([]);
    }

    metricFindNodeFilterQuery(query) {
        return this.client.getExporters().then(exporters => {
            var results = [];
            _.each(exporters, function (exporter) {
                results.push({text: exporter.label, value: exporter.id, expandable: true});
            });
            return results;
        });
    }

    metricFindNodeResourceQuery(query) {
        return this.client.getExporter(query).then(exporter => {
            console.log(exporter);
            var results = [];
            _.each(exporter.interfaces, function (iff) {
                results.push({text: iff.name + "(" + iff.index + ")", value: iff.index, expandable: true});
            });
            return results;
        });
    }

    toSeries(flowSeries, options) {
        let start = flowSeries.start.valueOf();
        let end = flowSeries.end.valueOf();
        let columns = flowSeries.columns;
        let values = flowSeries.values;
        let timestamps = flowSeries.timestamps;
        let series = [];
        let i, j, nRows, nCols, datapoints;

        let step = timestamps[1] - timestamps[0];


        if (timestamps !== undefined) {
            nRows = timestamps.length;
            nCols = columns.length;

            for (i = 0; i < nCols; i++) {
                let multiplier = 1;
                let suffix = " (In)";
                if (!columns[i].ingress) {
                    multiplier *= -1;
                    suffix = " (Out)";
                }
                if (options.targets[0].toRate) {
                    multiplier /= step / 1000;
                }

                datapoints = [];
                for (j = 0; j < nRows; j++) {
                    // Skip rows that are out-of-range
                    if (timestamps[j] < start || timestamps[j] > end) {
                        continue;
                    }

                    if (values[i][j] === 'NaN') {
                        values[i][j] = null;
                    }

                    datapoints.push([values[i][j] * multiplier, timestamps[j]]);
                }

                series.push({
                    target: columns[i].label + suffix,
                    datapoints: datapoints
                });
            }
        }

        console.log("series", series, flowSeries);
        return series;
    }
}
