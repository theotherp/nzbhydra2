package org.nzbhydra.database;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.Data;

import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.PrimaryKeyJoinColumn;
import javax.persistence.Table;
import java.time.Instant;


@Data
@Entity
@Table(name="indexerapiaccess")
public class IndexerApiAccessEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;
    @ManyToOne
    @PrimaryKeyJoinColumn
    @JsonManagedReference
    private IndexerEntity indexer;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;
    @Enumerated(EnumType.STRING)
    private IndexerApiAccessResult result;
    @Enumerated(EnumType.STRING)
    private IndexerApiAccessType accessType;
    private Long responseTime;
    private String error;
    private String url;
    //TODO username / user ?


    public IndexerApiAccessEntity() {
        time = Instant.now();
    }




}
