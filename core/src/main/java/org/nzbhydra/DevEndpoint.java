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

package org.nzbhydra;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.capscheck.JacketConfigRetriever;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DevEndpoint {

    @Autowired
    private JacketConfigRetriever jacketConfigRetriever;

    private static final Logger logger = LoggerFactory.getLogger(DevEndpoint.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/dev", method = RequestMethod.GET)
    public String convertMovie() throws Exception {
        IndexerConfig config = new IndexerConfig();
        config.setHost("http://127.0.0.1:9117");
        config.setApiKey("mu7z3w65puy4b6i9rac1lt796xw4o21b");

        jacketConfigRetriever.retrieveIndexers(config);

        return "";
    }


}
