package org.nzbhydra.indexers;

import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.Instant;


/**
 * Stores indexer API accesses that will only be kept in the database for no more than 24 hours. Makes
 * checking for API hit limits much faster
 */
@Data
@Entity
@NoArgsConstructor
@Table(name = "indexerapiaccess_short")
public class IndexerApiAccessEntityShort {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    protected int id;

    private int indexer_id;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant time;

    private boolean successful;

    public IndexerApiAccessEntityShort(IndexerEntity indexerEntity, boolean successsful) {
        this.indexer_id = indexerEntity.getId();
        time = Instant.now();
        this.successful = successsful;
    }


}
