package org.nzbhydra.searching;

import com.google.common.collect.Multiset;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.indexers.Indexer;

import java.util.List;
import java.util.TreeSet;

@Data
@AllArgsConstructor
public class DuplicateDetectionResult {

    private List<TreeSet<SearchResultItem>> duplicateGroups;
    private Multiset<Indexer> uniqueResultsPerIndexer;

}
