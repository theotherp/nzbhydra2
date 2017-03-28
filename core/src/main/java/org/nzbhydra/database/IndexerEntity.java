package org.nzbhydra.database;

import com.fasterxml.jackson.annotation.JsonBackReference;
import lombok.Data;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import java.util.List;
import java.util.Objects;


@Data
@Entity
@Table(name = "indexer")
public class IndexerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    private String name;

    @OneToOne(cascade = CascadeType.ALL)
    @JsonBackReference
    private IndexerStatusEntity status;

    @OneToMany(orphanRemoval = true)
    @JsonBackReference
    @OrderBy("time desc")
    private List<IndexerApiAccessEntity> apiAccesses;

    public IndexerEntity() {
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
        IndexerEntity that = (IndexerEntity) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), id, name);
    }
}
