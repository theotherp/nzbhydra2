package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.database.IndexerEntity;

import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@Data
@AllArgsConstructor
public class DuplicateDetectionResult {

    private List<TreeSet<SearchResultItem>> duplicateGroups;
    private Map<IndexerEntity, Integer> uniqueResultsPerIndexer;

}
