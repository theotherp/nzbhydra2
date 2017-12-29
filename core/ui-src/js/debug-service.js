/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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
        for (var key in debug) {
            if (debug.hasOwnProperty(key)) {
                console.log("First " + key + ": " + $filter("date")(new Date(debug[key]["first"]), "h:mm:ss:sss"));
                console.log("Last " + key + ": " + $filter("date")(new Date(debug[key]["last"]), "h:mm:ss:sss"));
            }
        }
    }



}