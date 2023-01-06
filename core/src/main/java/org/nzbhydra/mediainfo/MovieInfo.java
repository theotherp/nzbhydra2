package org.nzbhydra.mediainfo;

import com.google.common.base.Strings;
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
@Table(name = "movieinfo")

public final class MovieInfo implements Comparable<MovieInfo> {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "MOVIEINFO_SEQ")
    protected int id;

    private String imdbId;
    private String tmdbId;
    private String title;
    private Integer year;
    private String posterUrl;

    public MovieInfo(String imdbId, String tmdbId, String title, Integer year, String posterUrl) {
        this.imdbId = Imdb.withTt(imdbId);
        this.tmdbId = tmdbId;
        this.title = title;
        this.year = year;
        this.posterUrl = posterUrl;
    }

    public MovieInfo(MediaInfo mediaInfo) {
        this.imdbId = mediaInfo.getImdbId().orElse(null);
        this.tmdbId = mediaInfo.getTmdbId().orElse(null);
        this.title = mediaInfo.getTitle().orElse(null);
        this.year = mediaInfo.getYear().orElse(null);
        this.posterUrl = mediaInfo.getPosterUrl().orElse(null);
    }

    public MovieInfo() {
    }

    public Optional<String> getImdbId() {
        return Optional.ofNullable(Imdb.withTt(Strings.emptyToNull(imdbId)));
    }

    public Optional<String> getTmdbId() {
        return Optional.ofNullable(Strings.emptyToNull(tmdbId));
    }

    public Optional<String> getTitle() {
        return Optional.ofNullable(Strings.emptyToNull(title));
    }

    public Optional<String> getPosterUrl() {
        return Optional.ofNullable(Strings.emptyToNull(posterUrl));
    }

    @Override
    public int compareTo(MovieInfo o) {
        if (o == null) {
            return 1;
        }
        return Integer.compare(getNumberOfContainedIds(), o.getNumberOfContainedIds());
    }

    protected int getNumberOfContainedIds() {
        int countContainedIds = 0;
        if (getImdbId().isPresent()) {
            countContainedIds++;
        }
        if (getTmdbId().isPresent()) {
            countContainedIds++;
        }
        return countContainedIds;
    }
}
