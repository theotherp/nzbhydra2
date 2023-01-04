/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

import org.assertj.core.api.Assertions;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SearchResultProvider {

    @Autowired
    private HydraClient hydraClient;

    public List<NewznabXmlItem> findSearchResults() {
        final HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=123");
        final String body = response.body();
        NewznabXmlRoot root = Jackson.getUnmarshal(body);
        return root.getRssChannel().getItems();
    }

    public String findOneGuid() {
        final List<NewznabXmlItem> searchResults = findSearchResults();
        Assertions.assertThat(searchResults).isNotEmpty();
        return searchResults.get(0).getRssGuid().getGuid();
    }
}
