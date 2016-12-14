package org.nzbhydra.database;

import lombok.Data;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import javax.validation.constraints.NotNull;
import java.time.Instant;


@Data
@Entity
@Table(name="searchresult"
        ,indexes = {
        @Index(columnList = "indexer_id,indexerguid", unique = true)}
        )
public class SearchResultEntity {

    @Id
    @GenericGenerator(
            name = "search-result-sequence",
            strategy = "org.nzbhydra.database.SearchResultSequenceGenerator",
            parameters = @org.hibernate.annotations.Parameter(
                    name = "sequence_name",
                    value = "hibernate_sequence"
            )
    )

    @GeneratedValue(generator = "search-result-sequence", strategy = GenerationType.SEQUENCE)
    protected int id;

    @ManyToOne
    @NotNull
    protected IndexerEntity indexer;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    protected Instant firstFound;

    @NotNull
    protected String title;

    @Column(name = "indexerguid")
    @NotNull
    protected String indexerGuid;

    protected String link;

    protected String details;


}
