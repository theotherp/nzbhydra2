package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.api.EnumDatabaseConverter;

import javax.persistence.*;
import java.time.Instant;


@Data
@Entity
@Table(name="indexerapiaccess")
public class IndexerApiAccessEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;
    @ManyToOne
    private IndexerEntity indexer;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;
    @Convert(converter = EnumDatabaseConverter.class)
    private IndexerApiAccessResult result;
    @Convert(converter = EnumDatabaseConverter.class)
    private IndexerApiAccessType accessType;
    private Long responseTime;
    private String error;
    private String url;
    //TODO username / user


    public IndexerApiAccessEntity() {
        time = Instant.now();
    }




}
