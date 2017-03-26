package org.nzbhydra.mediainfo;

import com.google.common.base.MoreObjects;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
class TvMazeSearchResult {

    private String tvMazeId;
    private String tvRageId;
    private String tvdbId;
    private String title;
    private Integer year;
    private String posterUrl;

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("tvMazeId", tvMazeId)
                .add("tvRageId", tvRageId)
                .add("tvdbId", tvdbId)
                .add("title", title)
                .add("year", year)
                .add("posterUrl", posterUrl)
                .toString();
    }
}
