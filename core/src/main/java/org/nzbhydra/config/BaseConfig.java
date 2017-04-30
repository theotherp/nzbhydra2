package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.core.JsonProcessingException;
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
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
@Data
@EqualsAndHashCode(exclude = {"applicationEventPublisher"})
public class BaseConfig extends ValidatingConfig {

    //TODO On startup when config file does not exist yet create it with initial config? Or wait for user to save?

    private static final Logger logger = LoggerFactory.getLogger(BaseConfig.class);


    @Autowired
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    private ApplicationEventPublisher applicationEventPublisher;

    private AuthConfig auth = new AuthConfig();
    private CategoriesConfig categoriesConfig = new CategoriesConfig();
    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private List<IndexerConfig> indexers = new ArrayList<>();
    private MainConfig main = new MainConfig();
    private SearchingConfig searching = new SearchingConfig();
    private static ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());


    public BaseConfig() {
        objectMapper.registerModule(new Jdk8Module());

    }

    public void replace(BaseConfig newConfig) {
        main = newConfig.getMain();
        categoriesConfig = newConfig.getCategoriesConfig();
        indexers = newConfig.getIndexers();
        downloaders = newConfig.getDownloaders();
        searching = newConfig.getSearching();
        auth = newConfig.getAuth();

        ConfigChangedEvent configChangedEvent = new ConfigChangedEvent(this, this);
        applicationEventPublisher.publishEvent(configChangedEvent);
    }

    public void save(File targetFile) throws IOException {
        logger.info("Writing config to file {}", targetFile.getAbsolutePath());
        objectMapper.writeValue(targetFile, this);
    }

    public void save() throws IOException {
        File file = buildConfigFileFile();
        save(file);
    }

    private File buildConfigFileFile() throws IOException {
        File mainFolder;
        try {
            mainFolder = new File(getClass().getProtectionDomain().getCodeSource().getLocation().toURI());
        } catch (URISyntaxException e) {
            throw new IOException("Unable to build path to config folder: " + e.getMessage());
        }
        File configFolder = new File(mainFolder, "config"); //TODO Use configurable folder and/or make sure we're in the correct folder
        if (!configFolder.exists()) {
            boolean created = configFolder.mkdir();
            if (!created) {
                throw new IOException("Unable to create config folder " + configFolder.getAbsolutePath());
            }
        }
        return new File(configFolder, "application.yml");
    }

    public void load() throws IOException {
        File file = buildConfigFileFile();
        replace(objectMapper.readValue(file, BaseConfig.class));
    }

    @JsonIgnore
    public String getAsYamlString() throws JsonProcessingException {
        return objectMapper.writeValueAsString(this);
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
        BufferedReader reader = new BufferedReader(new InputStreamReader(BaseConfig.class.getResource("/config/application.yml").openStream()));
        String applicationYmlContent = reader.lines().collect(Collectors.joining("\n"));
        return objectMapper.readValue(applicationYmlContent, BaseConfig.class);
    }

    public void setIndexers(List<IndexerConfig> indexers) {
        this.indexers = indexers;
    }

    @Override
    public List<String> validateConfig() {
        List<String> errorMessages = new ArrayList<>();
        errorMessages.addAll(auth.validateConfig());
        errorMessages.addAll(categoriesConfig.validateConfig());
        errorMessages.addAll(main.validateConfig());
        errorMessages.addAll(searching.validateConfig());
        //TODO indexers
        //TODO downloaders
        return errorMessages;
    }
}
