package org.nzbhydra.mediainfo;

import com.google.common.base.Strings;
import lombok.Data;

import javax.persistence.*;
import java.util.Optional;

@Data
@Entity
@Table(name = "movieinfo")

public class MovieInfo implements Comparable<MovieInfo> {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    private String imdbId;
    private String tmdbId;
    private String title;
    private Integer year;
    private String posterUrl;

    public MovieInfo(String imdbId, String tmdbId, String title, Integer year, String posterUrl) {
        this.imdbId = imdbId;
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
        return Optional.ofNullable(Strings.emptyToNull(imdbId));
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
