package org.nzbhydra.searching;

import com.google.common.collect.Multiset;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;

import java.util.LinkedHashSet;
import java.util.List;

@Data
@AllArgsConstructor
public class DuplicateDetectionResult {

    /**
     * List of sets where every set contains search results which are logically identical (different indexer, same usenet posting)
     */
    private List<LinkedHashSet<SearchResultItem>> duplicateGroups;
    /**
     * For each indexer the number of results which were only found by this indexer
     */
    private Multiset<Indexer> uniqueResultsPerIndexer;

}
