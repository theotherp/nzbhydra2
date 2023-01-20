package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.indexers.IndexerEntityTO;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.nzbhydra.springnative.ReflectionMarker;


@Data
@ReflectionMarker
public class IndexerSearchEntityTO {

    private int id;

    private IndexerEntityTO indexerEntity;
    private SearchEntityTO searchEntity;

    private Boolean successful;

    /**
     * Number of total results reported by the indexer
     */
    private Integer resultsCount;


}
