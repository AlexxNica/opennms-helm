'use strict';

System.register(['angular', 'lodash'], function (_export, _context) {
    "use strict";

    var angular, _;

    return {
        setters: [function (_angular) {
            angular = _angular.default;
        }, function (_lodash) {
            _ = _lodash.default;
        }],
        execute: function () {

            angular.module('grafana.directives').directive('onmsQuery', function () {
                return {
                    templateUrl: 'public/plugins/opennms-helm-app/datasources/fault-ds/partials/query.html',
                    controller: 'QueryController',
                    restrict: 'EA',
                    controllerAs: 'ctrl',
                    scope: {
                        query: "=", // The ui query object
                        datasource: "=", // The datasource
                        queryCtrl: "=" }
                };
            }).controller('QueryController', function ($scope, uiSegmentSrv, $q) {
                var datasource = $scope.datasource;
                var QueryCtrl = $scope.queryCtrl;
                $scope.query.updateControls();

                $scope.getSuggestions = function (clause, segment, index) {
                    var segments = clause.restriction.segments;

                    // attribute input
                    if (segment.type == 'key' || segment.type == 'plus-button') {
                        return datasource.metricFindQuery({ find: "attributes" }).then(function (attributes) {
                            var segments = _.map(attributes, function (attribute) {
                                var segment = uiSegmentSrv.newKey(attribute.name);
                                return segment;
                            });
                            return segments;
                        }).catch(QueryCtrl.handleQueryError.bind(QueryCtrl));
                    }

                    // comparator input
                    if (segment.type == 'operator') {
                        var attributeSegment = segments[index - 1];
                        return datasource.metricFindQuery({ 'find': 'comparators', 'attribute': attributeSegment.value }).then(function (comparators) {
                            return _.map(comparators, function (comparator) {
                                return uiSegmentSrv.newOperator(comparator);
                            });
                        });
                    }

                    // value input
                    if (segment.type == 'value') {
                        var _attributeSegment = segments[index - 2];
                        var theQuery = {
                            'find': 'values',
                            'attribute': _attributeSegment.value,
                            'query': segment.value === 'select attribute value' ? '' : segment.value
                        };

                        return datasource.metricFindQuery(theQuery).then(function (values) {
                            return _.map(values, function (searchResult) {
                                var segment = uiSegmentSrv.newKeyValue(searchResult.label);
                                return segment;
                            });
                        }).catch(QueryCtrl.handleQueryError.bind(QueryCtrl));
                    }

                    // condition input
                    if (segment.type === 'condition') {
                        return this.datasource.metricFindQuery({ find: 'operators' }).then(function (operators) {
                            return _.map(operators, function (operator) {
                                return uiSegmentSrv.newCondition(operator.label);
                            });
                        }).catch(QueryCtrl.handleQueryError.bind(QueryCtrl));
                    }
                    return $q.when([]);
                };

                $scope.segmentUpdated = function (clause, segment, segmentIndex) {
                    $scope.query.segmentUpdated(clause, segment, segmentIndex);
                    $scope.query.updateControls();
                    QueryCtrl.updateTargetFilter();
                };

                $scope.performClick = function (clause, control) {
                    if (control.action) {
                        control.action($scope.query, clause);
                        QueryCtrl.updateTargetFilter();
                        $scope.query.findParent().updateControls();
                    }
                };
            });
        }
    };
});
//# sourceMappingURL=query-directive.js.map
