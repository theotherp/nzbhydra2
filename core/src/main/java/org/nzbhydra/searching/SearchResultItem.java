package org.nzbhydra.searching;

import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.Category;
import org.nzbhydra.indexers.Indexer;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Data
public class SearchResultItem implements Comparable<SearchResultItem> {

    public enum HasNfo {
        NO,
        YES,
        MAYBE
    }

    public enum DownloadType {
        NZB,
        TORRENT
    }

    private boolean agePrecise;
    private Map<String, String> attributes = new HashMap<>();
    private Category category;
    private Integer commentsCount;
    private String commentsLink;
    private String description;
    private String details;
    private DownloadType downloadType;
    private int duplicateIdentifier;
    private Integer files;
    private Instant firstFound;
    private Integer grabs;
    private String group = null;
    private Long guid;
    private HasNfo hasNfo = HasNfo.MAYBE;
    private Indexer indexer;
    private String indexerGuid;
    private Integer indexerScore;
    private String link;
    private String originalCategory;
    private boolean passworded;
    private String poster = null;
    private Instant pubDate = null;
    private Long searchResultId;
    private Long size;
    private String title;
    private Instant usenetDate = null;

    public Optional<Instant> getUsenetDate() {
        return Optional.ofNullable(usenetDate);
    }

    public Optional<String> getGroup() {
        return Optional.ofNullable(group);
    }

    public Optional<String> getPoster() {
        return Optional.ofNullable(poster);
    }

    public long getAgeInDays() {
        Instant date = getUsenetDate().orElse(getPubDate());
        long ageInDays = date.until(Instant.now(), ChronoUnit.DAYS);
        return ageInDays;
    }

    public Instant getBestDate() {
        return getUsenetDate().orElse(getPubDate());
    }

    @Override
    public int compareTo(SearchResultItem o) {
        if (o == null) {
            return 1;
        }
        if (o.pubDate == null && pubDate != null) {
            return 1;
        }
        if (pubDate == null && o.pubDate != null) {
            return -1;
        }
        if (pubDate == null && o.pubDate == null) {
            return 0;
        }
        return o.getPubDate().compareTo(pubDate);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("guid", guid)
                .add("indexerName", indexer.getName())
                .add("title", title)
                .add("pubDate", pubDate)
                .add("size", size)
                .toString();
    }


}
