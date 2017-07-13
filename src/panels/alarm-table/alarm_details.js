
export class AlarmDetailsCtrl {

  /** @ngInject */
  constructor($scope, datasourceSrv) {
    this.$scope = $scope;
    this.datasourceSrv = datasourceSrv;
    $scope.editor = { index: 0 };
    $scope.alarm = $scope.$parent.alarm;
    $scope.source = $scope.$parent.source;

    let self = this;
    $scope.saveSticky = function() {
      self.getDatasource().then(ds => ds.saveSticky($scope.alarm.id, $scope.alarm.sticky));
    };
    $scope.deleteSticky = function() {
      self.getDatasource().then(ds => ds.deleteSticky($scope.alarm.id));
    };
    $scope.saveJournal = function() {
      self.getDatasource().then(ds => ds.saveJournal($scope.alarm.id, $scope.alarm.journal));
    };
    $scope.deleteJournal = function() {
      self.getDatasource().then(ds => ds.deleteJournal($scope.alarm.id));
    };
  }

  getDatasource() {
    return this.datasourceSrv.get(this.$scope.source).then(ds => {
      if (ds.type && ds.type.indexOf("fm-ds") < 0) {
        throw {message: 'Only OpenNMS datasources are supported'};
      } else {
        return ds;
      }
    });
  };
}

/** @ngInject */
export function alarmDetailsAsDirective() {
  'use strict';
  return {
    restrict: 'E',
    templateUrl: 'public/plugins/opennms-helm-app/panels/alarm-table/alarm_details.html',
    controller: AlarmDetailsCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    scope: {dismiss: "&"}
  };
}