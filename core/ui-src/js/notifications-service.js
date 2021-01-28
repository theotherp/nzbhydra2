angular
    .module('nzbhydraApp')
    .service('NotificationService', NotificationService);

function NotificationService($http) {

    var eventTypesData = {
        AUTH_FAILURE: {
            readable: "Auth failure",
            titleTemplate: "Auth failure",
            bodyTemplate: "NZBHydra: A login for username $username$ failed. IP: $ip$.",
            templateHelp: "Available variables: $username$, $ip$.",
            messageType: "FAILURE"
        },
        RESULT_DOWNLOAD: {
            readable: "NZB download",
            titleTemplate: "NZB download",
            bodyTemplate: "NZBHydra: The result \"$title$\" was grabbed from indexer $indexerName$.",
            templateHelp: "Available variables: $title, $indexerName$, $source$ (NZB or torrent), $age$ ([] for torrents).",
            messageType: "INFO"
        },
        RESULT_DOWNLOAD_COMPLETION: {
            readable: "Download completion",
            titleTemplate: "Download completion",
            bodyTemplate: "NZBHydra: Download of \"$title$\" has finished. Download result: $downloadResult$.",
            templateHelp: "Requires the downloading tool to be configured. Available variables: $title, $downloadResult$.",
            messageType: "INFO"
        },
        INDEXER_DISABLED: {
            readable: "Indexer disabled",
            titleTemplate: "Indexer disabled",
            bodyTemplate: "NZBHydra: Indexer $indexerName$ was disabled (state: $state$). Message:\n$message$.",
            templateHelp: "Available variables: $indexerName$, $state$, $message$.",
            messageType: "WARNING"
        },
        INDEXER_REENABLED: {
            readable: "Indexer reenabled after error",
            titleTemplate: "Indexer reenabled after error",
            bodyTemplate: "NZBHydra: Indexer $indexerName$ was reenabled after a previous error. It had been disabled since $disabledAt$.",
            templateHelp: "Available variables: $indexerName$, $disabledAt$.",
            messageType: "SUCCESS"
        },
        UPDATE_INSTALLED: {
            readable: "Automatic update installed",
            titleTemplate: "Update installed",
            bodyTemplate: "NZBHydra: A new version of was installed: $version$",
            templateHelp: "Available variables: $version$.",
            messageType: "SUCCESS"
        },
        VIP_RENEWAL_REQUIRED: {
            readable: "VIP renewal required (14 day warning)",
            titleTemplate: "VIP renewal required",
            bodyTemplate: "NZBHydra: VIP access for indexer $indexerName$ will run out soon: $expirationDate$.",
            templateHelp: "Available variables: $indexerName$, $expirationDate$.",
            messageType: "WARNING"
        }
    }

    this.getAllEventTypes = function () {
        return _.keys(eventTypesData);
    };

    this.getAllData = function () {
        return eventTypesData;
    };

    this.humanize = function (eventType) {
        return eventTypesData[eventType].readable;
    };

    this.getTemplateHelp = function (eventType) {
        return eventTypesData[eventType].templateHelp;
    };

    this.getTitleTemplate = function (eventType) {
        return eventTypesData[eventType].titleTemplate;
    };

    this.getBodyTemplate = function (eventType) {
        return eventTypesData[eventType].bodyTemplate;
    };

    this.testNotification = function (eventType) {
        return $http.get('internalapi/notifications/test/' + eventType);
    }


}