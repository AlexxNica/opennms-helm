import {API, Client, Rest, DAO} from '../../opennms'
import _ from 'lodash';

export class ClientDelegate {

    constructor(settings, backendSrv, $q) {
        this.type = settings.type;
        this.url = settings.url;
        this.name = settings.name;
        this.backendSrv = backendSrv;
        this.searchLimit = 1000;
        this.$q = $q;

        let authConfig = undefined;
        if (settings.basicAuth) {
          // If basic auth is configured, pass the username and password to the client
          // This allows the datasource to work in direct mode
          // We need the raw username and password, so we decode the token
          const token = settings.basicAuth.split(' ')[1];
          const decodedToken = atob(token);
          const username = decodedToken.split(':')[0];
          const password = decodedToken.substring(username.length+1, decodedToken.length);
          authConfig = new API.OnmsAuthConfig(username, password);
        }

        let server = new API.OnmsServer(this.name, this.url, authConfig);
        let http = new Rest.GrafanaHTTP(this.backendSrv, server);
        this.client = new Client(http);
        this.client.server = server;
        this.clientWithMetadata = undefined;
     }

    getClientWithMetadata() {
        if (!this.clientWithMetadata) {
              let self = this;
              let client = Client.getMetadata(this.client.server, this.client.http)
                .then(function(metadata) {
                    // Ensure the OpenNMS we are talking to is compatible
                    if (metadata.apiVersion() !== 2) {
                        throw new Error("Unsupported Version");
                    }
                    self.client.server.metadata = metadata;
                    return self.client;
                }).catch(function(e) {
                    // in case of error, reset the client, otherwise
                    // the datasource may never recover
                    self.clientWithMetadata = void 0;
                    throw e;
                });

          // Grafana functions that invoke the datasource expect the
          // promise to be one that is returned by $q.
          let deferred = this.$q.defer();
          client.then((success) => deferred.resolve(success)).catch((error) => deferred.reject(error));
          this.clientWithMetadata = deferred.promise;
        }
        return this.clientWithMetadata;
      }

    getFlowDao() {
        return this.getClientWithMetadata().then(function(client) {
            return client.flows();
        });
    }

    getSeriesForTopNApplications(N, start, end, step, nodeCriteria, interfaceId) {
        return this.getFlowDao()
            .then(function(flowDao) {
                return flowDao.getSeriesForTopNApplications(N, start, end, step, nodeCriteria, interfaceId);
            });
    }

    getExporters() {
        return this.getFlowDao()
            .then(function(flowDao) {
                return flowDao.getExporters(10);
            });
    }

    getExporter(nodeCriteria) {
        return this.getFlowDao()
            .then(function(flowDao) {
                return flowDao.getExporter(nodeCriteria, 10);
            });
    }
}
