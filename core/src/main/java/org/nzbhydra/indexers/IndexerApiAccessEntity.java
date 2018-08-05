package org.nzbhydra.indexers;

import com.google.common.base.MoreObjects;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import javax.persistence.*;
import java.time.Instant;
import java.util.Objects;


@Data
@Entity
@NoArgsConstructor
@Table(name = "indexerapiaccess")
public class IndexerApiAccessEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    protected int id;

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private IndexerEntity indexer;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant time;

    @Enumerated(EnumType.STRING)
    private IndexerAccessResult result;

    @Enumerated(EnumType.STRING)
    private IndexerApiAccessType accessType;
    private Long responseTime;
    @Column(length = 4000)
    private String error;
    //later username / user ?


    public IndexerApiAccessEntity(IndexerEntity indexerEntity) {
        this.indexer = indexerEntity;
        time = Instant.now();
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
        IndexerApiAccessEntity that = (IndexerApiAccessEntity) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), id);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("time", time)
                .add("result", result)
                .add("accessType", accessType)
                .add("responseTime", responseTime)
                .add("error", error)
                .toString();
    }
}
