

angular
    .module('nzbhydraApp')
    .factory('DebugService', DebugService);

function DebugService($filter) {

    var debug = {};

    return {
        log: log,
        print: print
    };

    function log(name) {
        if (!(name in debug)) {
            debug[name] = {first: new Date().getTime(), last: new Date().getTime()};
        } else {
            debug[name]["last"] = new Date().getTime();
        }
    }

    function print() {
         //Re-enable if necessary
        // for (var key in debug) {
        //     if (debug.hasOwnProperty(key)) {
        //         console.log("First " + key + ": " + $filter("date")(new Date(debug[key]["first"]), "h:mm:ss:sss"));
        //         console.log("Last " + key + ": " + $filter("date")(new Date(debug[key]["last"]), "h:mm:ss:sss"));
        //         console.log("Diff: " + (debug[key]["last"] - debug[key]["first"]));
        //     }
        // }
    }


}