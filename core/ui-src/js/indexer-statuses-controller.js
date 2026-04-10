angular
    .module('nzbhydraApp')
    .controller('IndexerStatusesController', IndexerStatusesController);

function IndexerStatusesController($scope, $http, statuses) {
    $scope.statuses = statuses.data;
    $scope.expiryWarnings = {};

    $scope.formatState = function (state) {
        if (state === "ENABLED") {
            return "Enabled";
        } else if (state === "DISABLED_SYSTEM_TEMPORARY") {
            return "Temporarily disabled by system";
        } else if (state === "DISABLED_SYSTEM") {
            return "Disabled by system";
        } else {
            return "Disabled by user";
        }
    };

    $scope.getLabelClass = function (state) {
        if (state === "ENABLED") {
            return "primary";
        } else if (state === "DISABLED_SYSTEM_TEMPORARY") {
            return "warning";
        } else if (state === "DISABLED_SYSTEM") {
            return "danger";
        } else {
            return "default";
        }
    };

    $scope.isInPast = function (epochSeconds) {
        return epochSeconds < moment().unix();
    };


    _.each($scope.statuses, function (status) {
            if (status.vipExpirationDate != null && status.vipExpirationDate !== "Lifetime") {
                var expiryDate = moment(status.vipExpirationDate, "YYYY-MM-DD");
                var messagePrefix = "VIP access";
                if (expiryDate < moment()) {
                    status.expiryWarning = messagePrefix + " expired";
                } else if (expiryDate.subtract(7, 'days') < moment()) {
                    status.expiryWarning = messagePrefix + " will expire in the next 7 days";
                }
                console.log(status.expiryWarning);
            }
        }
    )
    ;
}

angular
    .module('nzbhydraApp')
    .filter('formatDate', formatDate);

function formatDate(dateFilter) {
    return function (timestamp, hidePast) {
        if (timestamp) {
            if (timestamp * 1000 < (new Date).getTime() && hidePast) {
                return ""; //
            }

            var t = timestamp * 1000;
            t = dateFilter(t, 'yyyy-MM-dd HH:mm');
            return t;
        } else {
            return "";
        }
    }
}

angular
    .module('nzbhydraApp')
    .filter('reformatDate', reformatDate);

reformatDate.$inject = ["bootstrapped"];

function reformatDate(bootstrapped) {
    return function (date, format) {
        if (!date) {
            return "";
        }
        if (angular.isUndefined(format)) {
            format = "YYYY-MM-DD HH:mm";
        }
        return parseAppTimestamp(date, bootstrapped).format(format);
    }
}

angular
    .module('nzbhydraApp')
    .filter('reformatDateSeconds', reformatDateSeconds);

reformatDateSeconds.$inject = ["bootstrapped"];

function reformatDateSeconds(bootstrapped) {
    return function (date, format) {
        return parseAppTimestamp(date, bootstrapped).format("YYYY-MM-DD HH:mm:ss");
    }
}

function parseAppTimestamp(date, bootstrapped) {
    if (typeof date === "number") {
        return formatAppMoment(moment.unix(date), bootstrapped);
    }

    if (/^\d+(\.\d+)?$/.test(date)) {
        return formatAppMoment(moment.unix(parseFloat(date)), bootstrapped);
    }

    if (/Z$|[+-]\d\d(?::?\d\d)?$/.test(date)) {
        return formatAppMoment(moment.parseZone(date), bootstrapped);
    }

    return formatAppMoment(moment.utc(date), bootstrapped);
}

function formatAppMoment(date, bootstrapped) {
    if (bootstrapped && bootstrapped.serverTimeZone && moment.tz) {
        return date.clone().tz(bootstrapped.serverTimeZone);
    }
    return date.local();
}


angular
    .module('nzbhydraApp')
    .filter('humanizeDate', humanizeDate);

function humanizeDate() {
    return function (date) {
        return moment().to(moment.unix(date));
    }
}
