

package org.nzbhydra.searching.uniqueness;

import jakarta.persistence.Column;
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

    public IndexerUniquenessScoreEntity() {
    }

    public IndexerUniquenessScoreEntity(IndexerEntity indexer, int involved, int have, boolean hasResult) {
        this.indexer = indexer;
        this.involved = involved;
        this.have = have;
        this.hasResult = hasResult;
    }
}
