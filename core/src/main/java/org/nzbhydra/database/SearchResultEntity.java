package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;
import java.time.Instant;


@Data
@Entity
@Table(name="searchresult"
        ,indexes = {
        @Index(columnList = "indexer_entity_id,indexerguid", unique = true),
        @Index(columnList = "guid", unique = true)}
        )
public class SearchResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    protected String guid;

    @ManyToOne
    protected IndexerEntity indexerEntity;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    protected Instant firstFound;

    protected String title;

    @Column(name = "indexerguid")
    protected String indexerGuid;

    protected String link;

    protected String details;




}
