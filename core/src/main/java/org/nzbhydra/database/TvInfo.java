package org.nzbhydra.database;

import lombok.Data;

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


    private String tvdbId;
    private String tvrageId;
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

    public TvInfo() {
    }
}
