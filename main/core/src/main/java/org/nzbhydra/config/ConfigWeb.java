package org.nzbhydra.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ValidatingConfig.ConfigValidationResult;
import org.nzbhydra.config.safeconfig.SafeConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertySource;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpSession;
import javax.swing.filechooser.FileSystemView;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
public class ConfigWeb {

    private static final Logger logger = LoggerFactory.getLogger(ConfigWeb.class);

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ConfigurableEnvironment environment;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public BaseConfig getConfig(HttpSession session) throws IOException {

        return configProvider.getBaseConfig().loadSavedConfig();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config", method = RequestMethod.PUT, consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ConfigValidationResult setConfig(@RequestBody BaseConfig config) throws IOException {

        for (PropertySource<?> source : environment.getPropertySources()) {
            Set propertyNames = new HashSet();
            if (source.getSource() instanceof Properties) {
                propertyNames = ((Properties) source.getSource()).stringPropertyNames();
            } else if (source.getSource() instanceof LinkedHashMap) {
                propertyNames = ((LinkedHashMap) source.getSource()).keySet();
            }
            boolean contains = propertyNames.contains("main.externalUrl");
            if (contains) {
                logger.info(source.toString());
            }
        }

        logger.info("Received new config");
        ConfigValidationResult result = config.validateConfig(configProvider.getBaseConfig());
        if (result.isOk()) {
            configProvider.getBaseConfig().replace(config);
            configProvider.getBaseConfig().save();
        }
        return result;
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/config/reload", method = RequestMethod.GET)
    public GenericResponse reloadConfig() throws IOException {
        logger.info("Reloading config from file");
        try {
            configProvider.getBaseConfig().load();
        } catch (IOException e) {
            return new GenericResponse(false, e.getMessage());
        }
        return GenericResponse.ok();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/safe", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public SafeConfig getSafeConfig() {
        return new SafeConfig(configProvider.getBaseConfig());
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/config/folderlisting", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE)
    public FileSystemEntry getDirectoryListing(@RequestBody DirectoryListingRequest request) {
        if (request.getFullPath() == null) {
            return new FileSystemEntry(new File(System.getProperty("user.dir")), request.getType());
        }
        File folderFile = new File(request.getFullPath());
        if (request.isGoUp()) {
            if (folderFile.getParentFile() == null) {
                return FileSystemEntry.getRoots();
            }
            folderFile = new File(request.getFullPath()).getParentFile();
        } else {
            if (!folderFile.isAbsolute()) {
                folderFile = new File("", request.getFullPath());
            }
            if (folderFile.isFile()) {
                folderFile = folderFile.getParentFile();
            }
            while (!folderFile.exists() && folderFile.getParentFile() != null) {
                folderFile = folderFile.getParentFile();
            }
        }

        return new FileSystemEntry(folderFile, request.getType());
    }

    @Data
    @AllArgsConstructor
    public static class DirectoryListingRequest {
        private String fullPath;
        private String type;
        private boolean goUp;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FileSystemEntry {
        private String fullPath;
        private boolean hasParent;

        private List<FileSystemSubEntry> files = new ArrayList<>();
        private List<FileSystemSubEntry> folders = new ArrayList<>();

        public FileSystemEntry(File folderFile, String type) {
            this.fullPath = folderFile.getAbsolutePath();
            if (folderFile.isDirectory()) {
                if (folderFile.getParentFile() == null) {
                    hasParent = true;
                } else {
                    hasParent = !Arrays.asList(File.listRoots()).contains(folderFile);
                }
                File[] files = folderFile.listFiles();
                if (files != null) {
                    this.folders = Stream.of(files).filter(file -> file.isDirectory() && FileSystemView.getFileSystemView().isTraversable(file)).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    if (!type.equals("folder")) {
                        this.files = Stream.of(files).filter(File::isFile).map(FileSystemSubEntry::new).collect(Collectors.toList());
                    }
                }
            }
        }

        public static FileSystemEntry getRoots() {
            FileSystemEntry entry = new FileSystemEntry();
            entry.folders = Stream.of(File.listRoots()).filter(x -> FileSystemView.getFileSystemView().isTraversable(x)).map(x -> new FileSystemSubEntry(x.getPath(), x.getPath())).collect(Collectors.toList());
            entry.hasParent = false;
            return entry;
        }
    }

    @Data
    @AllArgsConstructor
    public static class FileSystemSubEntry {
        private String name;
        private String fullPath;

        public FileSystemSubEntry(File file) {
            name = file.getName().equals("") ? file.getPath() : file.getName(); //Roots don't contain a name
            fullPath = file.getAbsolutePath();
        }
    }


}
