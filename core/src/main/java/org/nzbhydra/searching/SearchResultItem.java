package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.mapping.Indexer;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
public class SearchResultItem extends SearchResultEntity {

    protected int id;

    private Instant firstFound;

    private String title;

    private String guid;

    private String link;

    private String details;
    
    private Indexer indexer;

    private Instant pubDate;

    private boolean agePrecise;

    private Long size;

    private String description;

    private String poster;

    private String group;

    private Map<String, String> attributes = new HashMap<>();


    public SearchResultItem(SearchResultEntity entity) {
        id = entity.getId();
        firstFound = entity.getFirstFound();
        details = entity.getDetails();
        title = entity.getTitle();
        indexer = new Indexer(entity.getIndexerEntity());

        //TODO calculate guid
    }




}
