package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerForSearchSelector.IndexerForSearchSelection;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
//@Builder
public class SearchResult {

    private List<SearchResultItem> searchResultItems = new ArrayList<>();
    private List<IndexerSearchResult> indexerSearchResults = new ArrayList<>();
    private int offset;
    private int limit;
    private Multiset<String> reasonsForRejection = HashMultiset.create();
    private IndexerForSearchSelection indexerSelectionResult;
    private Multiset<Indexer> uniqueResultsPerIndexer;
    private int numberOfTotalAvailableResults;
    private int numberOfRemovedDuplicates;
    private int numberOfFoundDuplicates;


    public int getNumberOfProcessedResults() {
        return getNumberOfRejectedResults() + getNumberOfAcceptedResults();
    }

    public int getNumberOfAcceptedResults() {
        return searchResultItems.size();
    }

    public int getNumberOfRejectedResults() {
        return reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
    }

}
