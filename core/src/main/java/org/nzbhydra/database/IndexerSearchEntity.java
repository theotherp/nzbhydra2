package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import java.util.Objects;


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
    private Boolean successful;

    /**
     * Number of total results reported by the indexer
     */
    private Integer resultsCount;

    /**
     * Number of results that were actually processed (e.g. 100 of 1000 results were loaded for a search, this is 100, {@link #resultsCount} is 1000)
     */
    private Integer processedResults;

    /**
     * Number of results in a search that were only returned by this indexer and one else
     */
    private Integer uniqueResults;

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
        if (!super.equals(o)) {
            return false;
        }
        IndexerSearchEntity entity = (IndexerSearchEntity) o;
        return id == entity.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), id);
    }
}
