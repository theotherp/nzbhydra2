package org.nzbhydra.mediainfo;

import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

@Data
@Entity
@Table(name = "movieinfo")

public class MovieInfo {

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

    public MovieInfo() {
    }
}
