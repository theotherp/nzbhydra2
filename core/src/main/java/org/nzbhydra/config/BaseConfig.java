package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import lombok.AccessLevel;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
@Data
@EqualsAndHashCode(exclude = {"applicationEventPublisher"})
public class BaseConfig {

    //TODO On startup when config file does not exist yet create it with initial config? Or wait for user to save?

    private static final Logger logger = LoggerFactory.getLogger(BaseConfig.class);

    @Autowired
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private ApplicationEventPublisher applicationEventPublisher;

    private AuthConfig auth = new AuthConfig();
    private List<Category> categories = new ArrayList<>();
    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private List<IndexerConfig> indexers = new ArrayList<>();
    private MainConfig main = new MainConfig();
    private SearchingConfig searching = new SearchingConfig();

    public BaseConfig() {
    }

    public void replace(BaseConfig newConfig) {
        main = newConfig.getMain();
        categories = newConfig.getCategories();
        indexers = newConfig.getIndexers();
        downloaders = newConfig.getDownloaders();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();

        ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, this);
        applicationEventPublisher.publishEvent(configChangedEvent);
    }

    public void save() throws IOException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
        objectMapper.registerModule(new Jdk8Module());
        File configFolder = new File("config"); //TODO Use configurable folder and/or make sure we're in the correct folder
        if (!configFolder.exists()) {
            boolean created = configFolder.mkdir();
            if (!created) {
                throw new IOException("Unable to create config folder " + configFolder.getAbsolutePath());
            }
        }
        File file = new File(configFolder, "application.yml");
        logger.info("Writing config to file {}", file.getAbsolutePath());
        objectMapper.writeValue(file, this);
    }


    @JsonIgnore
    public String getBaseUrl() {
        return getBaseUriBuilder().toUriString();
    }

    @JsonIgnore
    public UriComponentsBuilder getBaseUriBuilder() {
        UriComponentsBuilder builder = UriComponentsBuilder.newInstance()
                .host(main.getHost().equals("0.0.0.0") ? "127.0.0.1" : main.getHost())
                .scheme(main.isSsl() ? "https" : "http")
                .port(main.getPort());
        if (main.getUrlBase().isPresent() && !main.getUrlBase().get().equals("/")) {
            builder.path(main.getUrlBase().get());
        }
        return builder;
    }


    /**
     * Returns the original config as it was deployed
     *
     * @return the content of config/application.yml (from resources) as BaseConfig object
     * @throws IOException Unable to read application.yml
     */
    public static BaseConfig originalConfig() throws IOException {
        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        yamlMapper.registerModule(new Jdk8Module());
        BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/application.yml").openStream()));
        String applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
        return yamlMapper.readValue(applicationYmlContent, BaseConfig.class);
    }

    public void setIndexers(List<IndexerConfig> indexers) {
        this.indexers = indexers;
    }
}
