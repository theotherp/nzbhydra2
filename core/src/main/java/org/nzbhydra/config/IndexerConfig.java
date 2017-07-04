package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.indexers.Indexer.BackendType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Data
@ConfigurationProperties(prefix = "indexers")
public class IndexerConfig extends ValidatingConfig {

    @SensitiveData
    private String apiKey;
    @JsonFormat(shape = Shape.STRING)
    private BackendType backend = BackendType.NEWZNAB;
    private IndexerCategoryConfig categoryMapping = new IndexerCategoryConfig();
    private boolean configComplete;
    private List<String> enabledCategories = new ArrayList<>();
    private Integer downloadLimit = null;
    private boolean enabled;
    @JsonFormat(shape = Shape.STRING)
    private SearchSourceRestriction enabledForSearchSource = SearchSourceRestriction.BOTH;
    private Integer generalMinSize = null;
    private Integer hitLimit = null;
    private Integer hitLimitResetTime = null;
    private String host;
    private Integer loadLimitOnRandom = null;
    private String name;
    @SensitiveData
    private String password = null;
    private boolean preselect;
    private Integer score = null;
    private SearchModuleType searchModuleType = SearchModuleType.NEWZNAB;
    private boolean showOnSearch;
    @JsonFormat(shape = Shape.STRING)
    private List<IdType> supportedSearchIds = new ArrayList<>();
    private List<ActionAttribute> supportedSearchTypes = new ArrayList<>();
    private Integer timeout = null;
    @SensitiveData
    private String username = null;
    private String userAgent = null; //TODO

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

    public Optional<Integer> getGeneralMinSize() {
        return Optional.ofNullable(generalMinSize);
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


    public Optional<String> getUserAgent() {
        return Optional.ofNullable(userAgent);
    }


    @Override
    public ConfigValidationResult validateConfig() {
        return new ConfigValidationResult();
    }
}
