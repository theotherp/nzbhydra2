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
            readable: "Download",
            titleTemplate: "Download",
            bodyTemplate: "NZBHydra: The title \"$title$\" was downloaded from indexer $indexerName$.",
            templateHelp: "Available variables: $title, $indexerName$, $source$ (NZB or torrent), $age$ ([] for torrents).",
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
        // ALL_API_EXHAUSTED: {
        //     readable: "All API hits exhausted",
        //     titleTemplate: "All API hits exhausted",
        //     bodyTemplate: "NZBHydra: All API hits have been exhausted. Next possible hit: $nextHitAt$.",
        //     templateHelp: "Available variables: $nextHitAt$."
        // },
        // ALL_DOWNLOAD_EXHAUSTED: {
        //     readable: "All downloads exhausted",
        //     titleTemplate: "All downloads exhausted",
        //     bodyTemplate: "NZBHydra: All downloads have been exhausted. Next possible hit: $nextDownloadAt$.",
        //     templateHelp: "Available variables: $nextDownloadAt$."
        // },
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