package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.searching.IndexerPicker.PickingResult;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@Getter
@Setter
//@Builder
public class SearchResult {

    private DuplicateDetectionResult duplicateDetectionResult;
    private Map<Indexer, List<IndexerSearchResult>> indexerSearchResultMap = new HashMap<>();
    private Multiset<String> reasonsForRejection = HashMultiset.create();
    private PickingResult pickingResult;

    public SearchResult() {
        duplicateDetectionResult = new DuplicateDetectionResult(new ArrayList<>(), HashMultiset.create());
    }

    public int calculateNumberOfResults() {
        if (duplicateDetectionResult == null) {
            return 0;
        }

        return duplicateDetectionResult.getDuplicateGroups().stream().mapToInt(TreeSet::size).sum() +

                reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
    }
}
