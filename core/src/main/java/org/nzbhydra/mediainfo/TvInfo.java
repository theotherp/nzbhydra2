package org.nzbhydra.mediainfo;

import com.google.common.base.Strings;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Optional;

@Data
@ReflectionMarker
@Entity
@Table(name = "tvinfo")
public class TvInfo implements Comparable<TvInfo> {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "TVINFO_SEQ")
    protected int id;

    @Column(unique = true)
    private String tvdbId;
    @Column(unique = true)
    private String tvrageId;
    @Column(unique = true)
    private String tvmazeId;
    @Column(unique = true)
    private String imdbId;
    private String title;
    private Integer year;
    private String posterUrl;

    public TvInfo(String tvdbId, String tvrageId, String tvmazeId, String imdbId, String title, Integer year, String posterUrl) {
        this.tvdbId = tvdbId;
        this.tvrageId = tvrageId;
        this.tvmazeId = tvmazeId;
        this.imdbId = Imdb.withTt(imdbId);
        this.title = title;
        this.year = year;
        this.posterUrl = posterUrl;
    }

    public TvInfo(MediaInfo mediaInfo) {
        this.tvdbId = mediaInfo.getTvDbId().orElse(null);
        this.tvrageId = mediaInfo.getTvRageId().orElse(null);
        this.tvmazeId = mediaInfo.getTvMazeId().orElse(null);
        this.imdbId = mediaInfo.getImdbId().orElse(null);
        this.title = mediaInfo.getTitle().orElse(null);
        this.year = mediaInfo.getYear().orElse(null);
        this.posterUrl = mediaInfo.getPosterUrl().orElse(null);
    }

    public TvInfo() {
    }

    public Optional<String> getTvdbId() {
        return Optional.ofNullable(Strings.emptyToNull(tvdbId));
    }

    public Optional<String> getTvrageId() {
        return Optional.ofNullable(Strings.emptyToNull(tvrageId));
    }

    public Optional<String> getTvmazeId() {
        return Optional.ofNullable(Strings.emptyToNull(tvmazeId));
    }

    public Optional<String> getImdbId() {
        return Optional.ofNullable(Imdb.withTt(imdbId));
    }

    public Optional<String> getPosterUrl() {
        return Optional.ofNullable(Strings.emptyToNull(posterUrl));
    }

    @Override
    public int compareTo(TvInfo o) {
        if (o == null) {
            return 1;
        }
        return Integer.compare(getNumberOfContainedIds(), o.getNumberOfContainedIds());
    }

    protected int getNumberOfContainedIds() {
        int countContainedIds = 0;
        if (getTvmazeId().isPresent()) {
            countContainedIds++;
        }
        if (getTvrageId().isPresent()) {
            countContainedIds++;
        }
        if (getTvdbId().isPresent()) {
            countContainedIds++;
        }
        if (getImdbId().isPresent()) {
            countContainedIds++;
        }
        return countContainedIds;
    }
}
