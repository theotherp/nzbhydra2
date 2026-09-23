

package org.nzbhydra.config.auth;

import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "auth.users")
public class UserAuthConfig {

    public static final String PASSWORD_ID = "{noop}";

    /**
     * Stable identity of this record, assigned by the backend (see ConfigRecordIds in core) and never shown to the
     * user. Secrets are sent to the UI masked, and a masked value is resolved against the stored record with the same
     * id, so a rename or a reordered list can never move one record's secret onto another.
     */
    @DiffIgnore
    private String id;

    private boolean maySeeAdmin;
    private boolean maySeeDetailsDl;
    private boolean maySeeStats;
    private boolean showIndexerSelection;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;

}
