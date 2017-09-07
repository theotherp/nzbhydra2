package org.nzbhydra.mediainfo;

import lombok.Data;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

@Data
@Entity
@Table(name = "tvinfo")
public class TvInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @Column(unique = true)
    private String tvdbId;
    @Column(unique = true)
    private String tvrageId;
    @Column(unique = true)
    private String tvmazeId;
    private String title;
    private Integer year;
    private String posterUrl;

    public TvInfo(String tvdbId, String tvrageId, String tvmazeId, String title, Integer year, String posterUrl) {
        this.tvdbId = tvdbId;
        this.tvrageId = tvrageId;
        this.tvmazeId = tvmazeId;
        this.title = title;
        this.year = year;
        this.posterUrl = posterUrl;
    }

    public TvInfo(MediaInfo mediaInfo) {
        this.tvdbId = mediaInfo.getTvDbId().orElse(null);
        this.tvrageId = mediaInfo.getTvRageId().orElse(null);
        this.tvmazeId = mediaInfo.getTvMazeId().orElse(null);
        this.title = mediaInfo.getTitle().orElse(null);
        this.year = mediaInfo.getYear().orElse(null);
        this.posterUrl = mediaInfo.getPosterUrl().orElse(null);
    }

    public TvInfo() {
    }
}
