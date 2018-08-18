package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchMetaData;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class SearchResponse {

    private List<IndexerSearchMetaData> indexerSearchMetaDatas = new ArrayList<>();
    private Map<String, Integer> rejectedReasonsMap = new HashMap<>();
    private Map<String, String> notPickedIndexersWithReason;
    private List<SearchResultWebTO> searchResults = new ArrayList<>();
    private int numberOfAvailableResults;
    private int numberOfAcceptedResults;
    private int numberOfRejectedResults;
    private int numberOfProcessedResults;
    private int offset;
    private int limit;


}
