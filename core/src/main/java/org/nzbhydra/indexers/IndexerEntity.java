package org.nzbhydra.indexers;

import com.google.common.base.MoreObjects;
import lombok.Data;

import javax.persistence.*;
import java.util.Objects;


@Data
@Entity
@Table(name = "indexer")
public class IndexerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @Column(unique = true)
    private String name;

    public IndexerEntity() {
    }

    public IndexerEntity(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        IndexerEntity that = (IndexerEntity) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("id", id)
                .add("name", name)
                .toString();
    }
}
