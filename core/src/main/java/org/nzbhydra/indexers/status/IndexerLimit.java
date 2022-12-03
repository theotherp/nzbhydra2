package org.nzbhydra.indexers.status;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.nzbhydra.indexers.IndexerEntity;

import java.time.Instant;

@Data
@Entity
@Table(name = "indexerlimit")

public class IndexerLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "INDEXERLIMIT_SEQ")
    protected int id;

    @OneToOne
    private IndexerEntity indexer;
    private Integer apiHits;
    private Integer apiHitLimit;
    private Integer downloads;
    private Integer downloadLimit;
    private Instant oldestApiHit;
    private Instant oldestDownload;


    public IndexerLimit(IndexerEntity indexer) {
        this.indexer = indexer;
    }

    public IndexerLimit() {
    }
}
