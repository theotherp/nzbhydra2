package org.nzbhydra.indexers.status;

import lombok.Data;
import org.nzbhydra.indexers.IndexerEntity;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToOne;
import javax.persistence.Table;
import java.time.Instant;

@Data
@Entity
@Table(name = "indexerlimit")

public class IndexerLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
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
