package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig {

    private String apikey = null;
    @JsonFormat(shape = Shape.STRING)
    private BackendType backend;
    private Set<String> categories = new HashSet<>();
    private Integer downloadLimit = null;
    private boolean enabled = true;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction enabledForSearchSource = SearchSourceRestriction.BOTH;
    private Integer generalMinSize = null;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host = null;
    private Integer loadLimitOnRandom = null;
    private String name = null;
    private String password = null;
    private boolean preselect = true;
    private Integer score = null;
    private SearchModuleType searchModuleType;
    private boolean showOnSearch = true;
    @JsonFormat(shape = Shape.STRING)
    private Set<IdType> supportedSearchIds = new HashSet<>();
    private Integer timeout = null;
    private String type; //TODO what is this?

    private String username = null;

    public Optional<Integer> getHitLimit() {
        return Optional.ofNullable(hitLimit);
    }

    public Optional<Integer> getDownloadLimit() {
        return Optional.ofNullable(downloadLimit);
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
