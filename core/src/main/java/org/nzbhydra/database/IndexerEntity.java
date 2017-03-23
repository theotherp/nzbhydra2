package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;


@Data
@Entity
@Table(name = "indexerName")
public class IndexerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    private String name;

    @OneToOne(cascade = {CascadeType.ALL})
    private IndexerStatusEntity status;

    public IndexerEntity() {
    }




}
