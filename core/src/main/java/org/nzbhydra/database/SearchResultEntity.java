package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;


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
    protected IndexerEntity indexer;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    protected Instant firstFound;

    protected String title;

    @Column(name = "indexerguid")
    protected String indexerGuid;

    protected String link;

    protected String details;

    @Transient
    private Integer indexerScore;
    @Transient
    private Instant pubDate;
    @Transient
    private boolean agePrecise;
    @Transient
    private Long size;
    @Transient
    private String description;
    @Transient
    private String poster;
    @Transient
    private String group;
    @Transient
    private Map<String, String> attributes = new HashMap<>();




}
