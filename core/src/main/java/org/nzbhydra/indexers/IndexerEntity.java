package org.nzbhydra.indexers;

import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.indexer.IndexerState;

import javax.persistence.*;
import java.time.Instant;
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

    @Enumerated(EnumType.STRING)
    private IndexerState state;

    private String lastError;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant disabledUntil;

    private int disabledLevel;

    public IndexerEntity() {
    }

    public void setState(IndexerState state) {
        this.state = state;
    }

    public void setDisabledUntil(Instant disabledUntil) {
        this.disabledUntil = disabledUntil;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == IndexerState.ENABLED || state == IndexerState.DISABLED_USER) {
            this.disabledUntil = null;
        }
    }

    public void setDisabledLevel(int disabledLevel) {
        this.disabledLevel = disabledLevel;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == IndexerState.ENABLED || state == IndexerState.DISABLED_USER) {
            this.disabledLevel = 0;
        }
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
        //When the config is written from YAML or from the web the setters are called in any order
        if (state == IndexerState.ENABLED || state == IndexerState.DISABLED_USER) {
            this.lastError = null;
        }
    }

    public boolean isInUsableState() {
        return
                state == IndexerState.ENABLED
                        || (state == IndexerState.DISABLED_SYSTEM_TEMPORARY
                        && (disabledUntil == null || disabledUntil.isBefore(Instant.now())));
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

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("id", id)
                .add("name", name)
                .toString();
    }
}
