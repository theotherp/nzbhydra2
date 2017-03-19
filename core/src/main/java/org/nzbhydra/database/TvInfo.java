package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "tvinfo")
public class TvInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;


    private String tvDbId;
    private String tvRageId;
    private String tvMazeId;
    private String title;
    private Integer year;
    private String posterUrl;

    public TvInfo(String tvDbId, String tvRageId, String tvMazeId, String title, Integer year, String posterUrl) {
        this.tvDbId = tvDbId;
        this.tvRageId = tvRageId;
        this.tvMazeId = tvMazeId;
        this.title = title;
        this.year = year;
        this.posterUrl = posterUrl;
    }

    public TvInfo() {
    }
}
