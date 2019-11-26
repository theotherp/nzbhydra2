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

package org.nzbhydra.searching;

import com.google.common.collect.Iterables;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Data
public class IndexerSearchCacheEntry {

    private Indexer indexer;
    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private IndexerSearchEntity indexerSearchEntity;
    private List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();
    private int nextResultIndex = 0;

    public IndexerSearchCacheEntry(Indexer indexer) {
        this.indexer = indexer;
    }

    public boolean isLastSuccessful() {
        if (indexerSearchResults.isEmpty()) {
            return true;
        }
        return Iterables.getLast(indexerSearchResults).isWasSuccessful();
    }

    public List<IndexerSearchResult> getIndexerSearchResults() {
        return Collections.unmodifiableList(indexerSearchResults);
    }

    public void addIndexerSearchResult(IndexerSearchResult newIndexerSearchResult) {
        indexerSearchResults.add(newIndexerSearchResult);
        searchResultItems.clear();
        for (IndexerSearchResult indexerSearchResult : indexerSearchResults) {
            searchResultItems.addAll(indexerSearchResult.getSearchResultItems());
        }
        searchResultItems.sort(Comparator.comparingLong(x -> ((SearchResultItem) x).getBestDate().getEpochSecond()).reversed());
    }

    public List<SearchResultItem> getSearchResultItems() {
        return Collections.unmodifiableList(searchResultItems);
    }

    public boolean isMoreResultsInCache() {
        return searchResultItems.size() > nextResultIndex;
    }

    public SearchResultItem peek() {
        return searchResultItems.get(nextResultIndex);
    }

    public SearchResultItem pop() {
        return searchResultItems.get(nextResultIndex++);
    }

    public boolean isMoreResultsAvailable() {
        if (indexerSearchResults.isEmpty()) {
            return true;
        }
        return Iterables.getLast(indexerSearchResults).isHasMoreResults();
    }

    public boolean isAllPulled() {
        if (searchResultItems.isEmpty()) {
            return true;
        }
        return searchResultItems.size() < nextResultIndex;
    }

}
