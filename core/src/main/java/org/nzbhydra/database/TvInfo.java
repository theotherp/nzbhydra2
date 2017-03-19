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


}
