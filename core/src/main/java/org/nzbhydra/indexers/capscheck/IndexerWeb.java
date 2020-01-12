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

package org.nzbhydra.indexers.capscheck;

import com.google.common.collect.HashMultimap;
import com.google.common.collect.Multimap;
import com.google.common.collect.Multimaps;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.NewznabChecker.CheckerEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@RestController
public class IndexerWeb {

    @Autowired
    private NewznabChecker newznabChecker;
    @Autowired
    private SimpleConnectionChecker simpleConnectionChecker;

    Multimap<String, String> multimap = Multimaps.synchronizedMultimap(
            HashMultimap.create());

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCaps", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public List<CheckCapsResponse> checkCaps(@RequestBody CapsCheckRequest capsCheckRequest) {
        multimap.clear();
        return newznabChecker.checkCaps(capsCheckRequest);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCapsMessages/{indexerName}", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public Collection<String> getCheckerMessages(@PathVariable String indexerName) {
        return multimap.get(indexerName);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkCapsMessages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Collection<String>> getCheckerMessages() {
        return multimap.asMap();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/indexer/checkConnection", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse testConnection(@RequestBody IndexerConfig indexerConfig) {
        if (indexerConfig.getSearchModuleType() == SearchModuleType.NEWZNAB || indexerConfig.getSearchModuleType() == SearchModuleType.TORZNAB) {
            return newznabChecker.checkConnection(indexerConfig);
        } else {
            return simpleConnectionChecker.checkConnection(indexerConfig);
        }
    }

    @EventListener
    public void handleCheckerEvent(CheckerEvent event) {
        if (!multimap.get(event.getIndexerName()).contains(event.getMessage())) {
            multimap.put(event.getIndexerName(), event.getMessage());
        }
    }

}
