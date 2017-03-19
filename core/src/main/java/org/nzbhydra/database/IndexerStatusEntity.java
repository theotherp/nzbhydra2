package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.*;
import java.time.Instant;


@Data
@Entity
@Table(name="indexerstatus")
public class IndexerStatusEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant firstFailure;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant lastFailure;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant disabledUntil;
    private Integer level = 0;
    private String reason;
    private Boolean disabledPermanently = false;


}
