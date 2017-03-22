package org.nzbhydra.searching;

import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.database.IndexerEntity;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
public class SearchResultItem implements Comparable<SearchResultItem> {

    private Integer guid;
    private IndexerEntity indexer;
    private Instant firstFound;
    private String title;
    private String indexerGuid;
    private String link;
    private String details;
    private Integer indexerScore;
    private Instant pubDate;
    private boolean agePrecise;
    private Long size;
    private String description;
    private String poster;
    private String group;
    private Map<String, String> attributes = new HashMap<>();
    private Integer searchResultId;


    @Override
    public int compareTo(SearchResultItem o) {
        return o.getPubDate().compareTo(pubDate);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("guid", guid)
                .add("indexer", indexer.getName())
                .add("title", title)
                .add("pubDate", pubDate)
                .add("size", size)
                .toString();
    }
}
