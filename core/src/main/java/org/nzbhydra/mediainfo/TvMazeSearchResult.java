package org.nzbhydra.mediainfo;

import com.google.common.base.MoreObjects;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
class TvMazeSearchResult {

    private String tvmazeId;
    private String tvrageId;
    private String tvdbId;
    private String imdbId;
    private String title;
    private Integer year;
    private String posterUrl;

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("tvmazeId", tvmazeId)
                .add("tvrageId", tvrageId)
                .add("tvdbId", tvdbId)
                .add("imdbId", imdbId)
                .add("title", title)
                .add("year", year)
                .add("posterUrl", posterUrl)
                .toString();
    }
}
