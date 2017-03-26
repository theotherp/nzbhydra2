package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerPicker.PickingResult;

import java.util.*;

@Data
public class SearchResult {

    private DuplicateDetectionResult duplicateDetectionResult;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchResultMap = new HashMap<>();
    private Multiset<String> reasonsForRejection = HashMultiset.create();
    private PickingResult pickingResult;

    public SearchResult() {
        duplicateDetectionResult = new DuplicateDetectionResult(new ArrayList<>(), new HashMap<>());
    }

    public int calculateNumberOfResults() {
        if (duplicateDetectionResult == null) {
            return 0;
        }

        return duplicateDetectionResult.getDuplicateGroups().stream().mapToInt(TreeSet::size).sum() +

                reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
    }
}
