package org.nzbhydra.searching;

import lombok.Data;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.mapping.Indexer;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
public class SearchResultItem extends SearchResultEntity implements Comparable<SearchResultItem> {

    protected int id;

    private Instant firstFound;

    private String title;

    private String guid;

    private String link;

    private String details;
    
    private Indexer indexer;

    private Integer indexerScore;

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


    @Override
    public int compareTo(SearchResultItem o) {
        int scoreComparison = Integer.compare(indexerScore, o.getIndexerScore());
        if (scoreComparison != 0) {
            return scoreComparison;
        }
        return pubDate.compareTo(o.getPubDate());
    }
}
