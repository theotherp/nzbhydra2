package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.indexers.Indexer.BACKEND_TYPE;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig {

    public enum SourceEnabled {
        INTERNAL,
        API,
        BOTH
    }

    private SourceEnabled enabledForSearchSource = SourceEnabled.BOTH;
    private String apikey;
    private BACKEND_TYPE backend;
    private Set<String> categories = new HashSet<>();
    private Integer downloadLimit;
    private boolean enabled;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host;
    private Integer loadLimitOnRandom = null;
    private String name;
    private String password = null;
    private boolean preselect;
    private Integer score = null;
    private String searchModuleType;
    private boolean showOnSearch;
    private Set<IdType> supportedSearchIds = new HashSet<>();
    private Integer timeout = null;
    private String type;
    private String username = null;

    public Optional<Integer> getHitLimit() {
        return Optional.ofNullable(hitLimit);
    }

    public Optional<Integer> getHitLimitResetTime() {
        return Optional.ofNullable(hitLimitResetTime);
    }

    public Optional<Integer> getLoadLimitOnRandom() {
        return Optional.ofNullable(loadLimitOnRandom);
    }

    public Optional<String> getPassword() {
        return Optional.ofNullable(password);
    }

    public Optional<Integer> getScore() {
        return Optional.ofNullable(score);
    }

    public Optional<Integer> getTimeout() {
        return Optional.ofNullable(timeout);
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(username);
    }
}
