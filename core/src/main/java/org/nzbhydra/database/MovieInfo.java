package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;

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


}
