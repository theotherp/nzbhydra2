package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;
import java.time.Instant;


@Data
@Entity
@Table(name = "indexersearch")
public class IndexerSearchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int id;

    @ManyToOne
    private IndexerEntity indexerEntity;
    @ManyToOne
    private SearchEntity searchEntity;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;
    private Boolean successful;
    private Integer resultsCount;
    private Integer uniqueResults;
    private Integer processedResults;

    public IndexerSearchEntity() {
        time = Instant.now();
    }
}
