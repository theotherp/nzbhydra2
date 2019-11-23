package org.nzbhydra.indexers;

import lombok.Data;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.searching.db.SearchEntity;

import javax.persistence.*;
import java.util.Objects;


@Data
@Entity
@Table(name = "indexersearch", indexes = {@Index(name = "ISINDEX1", columnList = "INDEXER_ENTITY_ID"), @Index(name = "ISINDEX2", columnList = "SEARCH_ENTITY_ID")})
public class IndexerSearchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private int id;

    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerEntity indexerEntity;
    @ManyToOne
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SearchEntity searchEntity;

    private Boolean successful;

    /**
     * Number of total results reported by the indexer
     */
    private Integer resultsCount;

    public IndexerSearchEntity() {
    }

    public IndexerSearchEntity(IndexerEntity indexerEntity, SearchEntity searchEntity) {
        this.indexerEntity = indexerEntity;
        this.searchEntity = searchEntity;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        IndexerSearchEntity entity = (IndexerSearchEntity) o;
        return id == entity.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
