

package org.nzbhydra.searching.dtoseventsenums;

import com.google.common.base.MoreObjects;
import com.google.common.base.Objects;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Data
@ReflectionMarker
public class SearchResultItem  {

    public enum HasNfo {
        NO,
        YES,
        MAYBE
    }

    //Note: Validation annotations relate to the needed state after the item was created by an indexer
    private boolean agePrecise;
    private Map<String, String> attributes = new HashMap<>();
    private Category category;
    private Integer commentsCount;
    private String commentsLink;
    private String cover;
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
    @NotNull
    private Indexer indexer;
    @NotNull
    private String indexerGuid;
    @NotNull
    private Integer indexerScore;
    @NotNull
    private String link;
    private String originalCategory;
    private boolean passworded;
    private Integer peers;
    private String poster;
    private Instant pubDate;
    private Long searchResultId;
    private Integer seeders;
    private Long size;
    private String source;
    @NotNull
    @NotEmpty
    private String title;
    private Instant usenetDate;

    public Optional<Instant> getUsenetDate() {
        return Optional.ofNullable(usenetDate);
    }

    public Optional<String> getGroup() {
        return Optional.ofNullable(group);
    }

    public Optional<String> getPoster() {
        return Optional.ofNullable(poster);
    }

    public Optional<String> getCover() {
        return Optional.ofNullable(cover);
    }

    public Optional<String> getSource() {
        return Optional.ofNullable(source);
    }

    public long getAgeInDays() {
        return getBestDate().until(Instant.now(), ChronoUnit.DAYS);
    }

    public Instant getBestDate() {
        return getUsenetDate().orElse(getPubDate());
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public static Comparator<SearchResultItem> comparator() {
        return (o1, o2) -> {
            if (o2 == null) {
                return 1;
            }
            if (o2.pubDate == null && o1.pubDate != null) {
                return 1;
            }
            if (o1.pubDate == null && o2.pubDate != null) {
                return -1;
            }
            if (o1.pubDate == null) {
                return 0;
            }
            return o1.getBestDate().compareTo(o2.getBestDate());
        };
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof SearchResultItem item)) {
            return false;
        }
        return Objects.equal(indexer, item.indexer) &&
                Objects.equal(indexerGuid, item.indexerGuid) &&
                Objects.equal(link, item.link) &&
                Objects.equal(title, item.title);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(indexer, indexerGuid, link, title);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("indexerName", indexer.getName())
                .add("guid", guid)
                .add("title", title)
                .add("pubDate", pubDate)
                .add("size", size)
                .toString();
    }


}
