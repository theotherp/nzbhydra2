package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import java.sql.Timestamp;

/**
 * Only used so schema generation for token storage is triggered
 */
@SuppressWarnings("unused")
@Entity
@Table(name = "persistent_logins")
@Data
public class PersistentLoginsEntity {

    @Id
    @NotNull
    private String series;
    @NotNull
    private String username;
    @NotNull
    private String token;
    @Column(name = "last_used")
    @NotNull
    private Timestamp lastUsed;
}
