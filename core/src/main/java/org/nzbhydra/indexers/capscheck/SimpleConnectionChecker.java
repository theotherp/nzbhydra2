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

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;

@Component
public class SimpleConnectionChecker {

    @Autowired
    protected IndexerWebAccess indexerWebAccess;
    private static final Logger logger = LoggerFactory.getLogger(SimpleConnectionChecker.class);

    public GenericResponse checkConnection(IndexerConfig config) {
        try {
            indexerWebAccess.get(new URI(config.getHost()), config, String.class);
        } catch (IndexerAccessException | URISyntaxException e) {
            logger.warn("Connection check with indexer {} failed. Error message: {}", config.getName(), e.getMessage());
            return GenericResponse.notOk(e.getMessage());
        }
        return GenericResponse.ok();
    }
}
