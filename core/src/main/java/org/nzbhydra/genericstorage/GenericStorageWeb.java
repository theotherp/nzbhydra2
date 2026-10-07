package org.nzbhydra.genericstorage;

import jakarta.servlet.http.HttpServletRequest;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.annotation.Secured;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.Set;

/**
 * Exposes the few generic storage entries the web UI itself reads and writes. Everything else in the storage
 * (update, backup and problem detection state, other users' records) is internal and unreachable from here: a key
 * that is not in {@link #ALLOWED_KEYS} is answered with 404 before the storage is touched.
 */
@RestController
public class GenericStorageWeb {

    static final int MAX_BODY_LENGTH = 1024;
    static final int MAX_STRING_LENGTH = 64;

    private static final Set<String> ADMIN_ROLES = Set.of("ROLE_ADMIN");
    private static final Set<String> ANY_UI_ROLE = Set.of("ROLE_ADMIN", "ROLE_USER", "ROLE_STATS");

    enum ValueType {
        BOOLEAN,
        STRING
    }

    /**
     * @param roles      the roles of which one is needed to read or write the key
     * @param perUser    stored under the key suffixed with the remote user's name (if there is one)
     * @param valueType  what a client may write
     */
    record AllowedKey(Set<String> roles, boolean perUser, ValueType valueType) {
    }

    static final Map<String, AllowedKey> ALLOWED_KEYS = Map.of(
            //Show-once warnings of the admin startup checks, raised by the problem detectors, cleared by the UI
            "outOfMemoryDetected", new AllowedKey(ADMIN_ROLES, false, ValueType.BOOLEAN),
            "showOpenToInternetWithoutAuth", new AllowedKey(ADMIN_ROLES, false, ValueType.BOOLEAN),
            "belowJava17", new AllowedKey(ADMIN_ROLES, false, ValueType.BOOLEAN),
            "FAILED_BACKUP", new AllowedKey(ADMIN_ROLES, false, ValueType.BOOLEAN),
            //Per user UI state
            "themePreference", new AllowedKey(ANY_UI_ROLE, true, ValueType.STRING),
            "isGroupEpisodesHelpShown", new AllowedKey(ANY_UI_ROLE, true, ValueType.BOOLEAN)
    );

    @Autowired
    private GenericStorage genericStorage;
    @Autowired
    private ConfigProvider configProvider;

    //The least privileged allowed key decides the baseline, the roles of the individual key are checked inside
    @Secured({"ROLE_ADMIN", "ROLE_USER", "ROLE_STATS"})
    @GetMapping("/internalapi/genericstorage/{key}")
    public Object get(@PathVariable String key, @RequestParam(required = false) boolean forUser, HttpServletRequest request) {
        final AllowedKey allowedKey = authorize(key);
        return genericStorage.get(storageKey(key, allowedKey, request), Object.class).orElse(null);
    }

    @Secured({"ROLE_ADMIN", "ROLE_USER", "ROLE_STATS"})
    @PutMapping("/internalapi/genericstorage/{key}")
    public void put(@PathVariable String key, @RequestParam(required = false) boolean forUser, @RequestBody String data, HttpServletRequest request) {
        final AllowedKey allowedKey = authorize(key);
        validate(data, allowedKey.valueType());
        genericStorage.save(storageKey(key, allowedKey, request), data);
    }

    private AllowedKey authorize(String key) {
        final AllowedKey allowedKey = ALLOWED_KEYS.get(key);
        if (allowedKey == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        //Mirrors HydraGlobalMethodSecurityConfiguration: without authentication nobody is restricted
        if (configProvider.getBaseConfig().getAuth().getAuthType() == AuthType.NONE && !NzbHydra.isNativeBuild()) {
            return allowedKey;
        }
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        final boolean permitted = authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(allowedKey.roles()::contains);
        if (!permitted) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return allowedKey;
    }

    private static String storageKey(String key, AllowedKey allowedKey, HttpServletRequest request) {
        if (allowedKey.perUser() && request.getRemoteUser() != null) {
            return key + "-" + request.getRemoteUser();
        }
        return key;
    }

    private static void validate(String data, ValueType valueType) {
        if (data == null || data.length() > MAX_BODY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE);
        }
        final JsonNode node;
        try {
            node = Jackson.JSON_MAPPER.readTree(data);
        } catch (JacksonException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Body is not valid JSON");
        }
        final boolean valid = switch (valueType) {
            case BOOLEAN -> node.isBoolean();
            case STRING -> node.isString() && node.asString().length() <= MAX_STRING_LENGTH;
        };
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unexpected value");
        }
    }

}
