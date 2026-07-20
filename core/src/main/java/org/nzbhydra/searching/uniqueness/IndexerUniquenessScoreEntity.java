

package org.nzbhydra.searching.uniqueness;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Entity
@Data
@ReflectionMarker
@Table(name = "indexeruniquenessscore")
public final class IndexerUniquenessScoreEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @SequenceGenerator(allocationSize = 1, name = "INDEXERUNIQUENESSSCORE_SEQ")
    private int id;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerEntity indexer;

    @Column(name = "involved")
    private int involved;

    @Column(name = "have")
    private int have;

    @Column(name = "hasresult")
    private boolean hasResult;

    @Column(name = "observation_id")
    private String observationId;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant recordedAt;

    @Column(name = "data_version")
    private Integer dataVersion;

    public IndexerUniquenessScoreEntity() {
    }

    public IndexerUniquenessScoreEntity(IndexerEntity indexer, int involved, int have, boolean hasResult) {
        this.indexer = indexer;
        this.involved = involved;
        this.have = have;
        this.hasResult = hasResult;
    }

    public IndexerUniquenessScoreEntity(IndexerEntity indexer, int involved, int have, boolean hasResult, String observationId, Instant recordedAt, int dataVersion) {
        this(indexer, involved, have, hasResult);
        this.observationId = observationId;
        this.recordedAt = recordedAt;
        this.dataVersion = dataVersion;
    }
}
