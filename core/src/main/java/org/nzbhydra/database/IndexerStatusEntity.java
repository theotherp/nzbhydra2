package org.nzbhydra.database;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.Data;

import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToOne;
import javax.persistence.PrimaryKeyJoinColumn;
import javax.persistence.Table;
import java.time.Instant;
import java.util.Objects;


@Data
@Entity
@Table(name="indexerstatus")
public class IndexerStatusEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @OneToOne(mappedBy = "status")
    @PrimaryKeyJoinColumn
    @JsonManagedReference
    private IndexerEntity indexer;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant firstFailure;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant lastFailure;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant disabledUntil;
    private Integer level = 0;
    private String reason;
    private Boolean disabledPermanently = false;

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
        IndexerStatusEntity that = (IndexerStatusEntity) o;
        return id == that.id;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), id, indexer.getName());
    }
}
