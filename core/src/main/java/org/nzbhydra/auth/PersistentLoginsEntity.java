package org.nzbhydra.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

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
