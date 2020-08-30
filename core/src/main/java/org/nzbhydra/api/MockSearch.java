/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.api;

import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class MockSearch {

    @Autowired
    private NewznabXmlTransformer newznabXmlTransformer;
    @Autowired
    private NewznabJsonTransformer newznabJsonTransformer;

    public NewznabResponse mockSearch(NewznabParameters params, boolean isNzb) {
        final List<SearchResultItem> searchResultItems = new ArrayList<>();
        final SearchResultItem item = new SearchResultItem();
        item.setTitle("Mocked result");
        item.setIndexerGuid("mockedResult");
        item.setIndexerScore(1);
        item.setLink("http://127.0.0.1");
        item.setOriginalCategory("Mock");
        item.setCategory(CategoryProvider.naCategory);
        item.setPubDate(Instant.now());
        item.setSize(10000L);
        searchResultItems.add(item);
        NewznabResponse response;
        if (params.getO() == OutputType.JSON) {
            response = newznabJsonTransformer.transformToRoot(searchResultItems, 0, 1, isNzb);
        } else {
            response = newznabXmlTransformer.getRssRoot(searchResultItems, 0, 1, isNzb);
        }

        return response;
    }

}
