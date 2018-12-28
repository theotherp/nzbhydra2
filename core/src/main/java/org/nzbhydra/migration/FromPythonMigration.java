package org.nzbhydra.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import joptsimple.internal.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import okhttp3.*;
import okhttp3.Request.Builder;
import org.nzbhydra.Jackson;
import org.nzbhydra.debuginfos.DebugInfosProvider;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class FromPythonMigration {

    private static final Logger logger = LoggerFactory.getLogger(FromPythonMigration.class);

    @Autowired
    private JsonConfigMigration configMigration;
    @Autowired
    private SqliteMigration sqliteMigration;
    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    protected TypeReference<Map<String, String>> mapTypeReference = new TypeReference<Map<String, String>>() {
    };

    @Transactional
    public MigrationResult migrateFromFiles(String settingsFilePath, String databaseFilePath, boolean doMigrateDatabase) {
        logger.info("Received request to migrate from settings file {} and database file {}", settingsFilePath, databaseFilePath);
        if (doMigrateDatabase && databaseFilePath == null) {
            return MigrationResult.requirementsNotMet("Database file not provided and database migration not selected to be skipped");
        }
        if (settingsFilePath == null) {
            return MigrationResult.requirementsNotMet("Config file not provided");
        }

        File settingsFile = new File(settingsFilePath);
        if (doMigrateDatabase) {
            File databaseFile = new File(databaseFilePath);
            if (!databaseFile.exists() || databaseFile.isDirectory()) {
                return MigrationResult.requirementsNotMet("Database file does not exist or is a folder");
            }
        }
        if (!settingsFile.exists() || settingsFile.isDirectory()) {
            return MigrationResult.requirementsNotMet("Config file does not exist or is a folder");
        }

        Map<String, String> migrationData = new HashMap<>();
        migrationData.put("databaseFile", databaseFilePath);
        migrationData.put("doMigrateDatabase", String.valueOf(doMigrateDatabase));
        try {
            migrationData.put("config", new String(Files.readAllBytes(settingsFile.toPath())));
        } catch (IOException e) {
            logger.error("Error while reading old settings file", e);
            return MigrationResult.requirementsNotMet("Error while reading old settings file: " + e);
        }
        MigrationResult migrationResult = new MigrationResult();
        migrationResult.setConfigMigrated(false);
        migrationResult.setDatabaseMigrated(false);
        return startMigration(migrationData);
    }

    @Transactional
    public MigrationResult migrateFromUrl(String nzbhydra1BaseUrl, boolean doMigrateDatabase, boolean checkForDocker) {
        logger.info("Received request to migrate from URL " + nzbhydra1BaseUrl);

        if (checkForDocker && DebugInfosProvider.isRunInDocker()) {
            return MigrationResult.requirementsNotMet("You seem to be running NZBHydra2 in a docker container. Please copy the files from your v1 data folder to the v2 data folder and provide the correct file paths in the file based migration");
        }

        OkHttpResponse versionsResponse = callHydraUrl(nzbhydra1BaseUrl, "get_versions");
        if (!versionsResponse.isSuccessful()) {
            String msg = "Unable to connect to NZBHydra 1: " + versionsResponse.getMessage();
            logger.error(msg);
            return MigrationResult.requirementsNotMet(msg);
        }

        Map<String, String> migrationData = null;
        try {
            Map<String, String> versionsData = Jackson.JSON_MAPPER.readValue(versionsResponse.getBody(), mapTypeReference);
            String currentVersionString = versionsData.get("currentVersion");
            SemanticVersion currentVersion = new SemanticVersion(currentVersionString);
            if (currentVersion.compareTo(new SemanticVersion("0.2.220")) < 0) {
                String msg = "Unable to migrate from NZBHydra 1 version " + currentVersionString + ". Must be at least 0.2.220";
                logger.error(msg);
                return MigrationResult.requirementsNotMet(msg);
            }
            OkHttpResponse migrationResponse = callHydraUrl(nzbhydra1BaseUrl, "migration");
            migrationData = Jackson.JSON_MAPPER.readValue(migrationResponse.getBody(), mapTypeReference);
            migrationData.put("doMigrateDatabase", String.valueOf(doMigrateDatabase));
        } catch (Exception e) {
            logger.error("Unexpected error while migrating", e);
            return MigrationResult.requirementsNotMet("Unexpected error while migrating: " + e.getMessage());
        }

        return startMigration(migrationData);
    }

    protected MigrationResult startMigration(Map<String, String> migrationData) {
        logger.info("Starting migration");
        List<String> migrationMessages = new ArrayList<>();

        if (migrationData.getOrDefault("doMigrateDatabase", "true").equals("true")) {
            try {
                migrationMessages = sqliteMigration.migrate(migrationData.get("databaseFile"), migrationMessages);
            } catch (Exception e) {
                logger.error("Error while migrating database", e);
                return MigrationResult.databaseMigrationFailed("Error while migrating database: " + e.getMessage(), migrationMessages);
            }
        }

        try {
            migrationMessages = configMigration.migrate(migrationData.get("config")).getMessages();
        } catch (Exception e) {
            logger.error("Unrecoverable error while migrating config", e);
            return MigrationResult.configMigrationFailed("Unrecoverable error while migrating config: " + e.getMessage());
        }

        logger.info("Migration completed successfully");
        return MigrationResult.migrationSuccessful(migrationMessages);
    }

    protected OkHttpResponse callHydraUrl(String nzbhydra1BaseUrl, String internalApiPath) {
        try {
            UriComponentsBuilder urlBuilder = UriComponentsBuilder.fromHttpUrl(nzbhydra1BaseUrl);
            urlBuilder.pathSegment("internalapi", internalApiPath).toUriString();
            String url = urlBuilder.toUriString();
            logger.info("Connecting to URL {}", url);
            Request request = new Builder().url(url).build();
            OkHttpClient.Builder clientBuilder = requestFactory.getOkHttpClientBuilder(request.url().uri());
            String userInfo = urlBuilder.build().toUri().getUserInfo();
            if (!Strings.isNullOrEmpty(userInfo)) {
                clientBuilder = clientBuilder.authenticator(new Authenticator() {
                    @Override
                    public Request authenticate(Route route, Response response) throws IOException {
                        String[] userAndPass = userInfo.split(":");
                        return response.request().newBuilder().header("Authorization", Credentials.basic(userAndPass[0], userAndPass[1])).build();
                    }
                });
            }
            try (Response response = clientBuilder.build().newCall(request).execute()) {
                return new OkHttpResponse(response.body().string(), response.isSuccessful(), response.message());
            }
        } catch (Exception e) {
            return new OkHttpResponse("", false, e.getMessage());
        }
    }

    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MigrationMessageEvent {
        private String message;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    //For mocking
    public static class OkHttpResponse {
        private String body;
        private boolean successful;
        private String message;
    }

    @Data
    public static class MigrationResult {

        private boolean requirementsMet;
        private boolean configMigrated;
        private boolean databaseMigrated;
        private List<String> warningMessages = new ArrayList<>();
        private String error;

        public static MigrationResult requirementsNotMet(String error) {
            MigrationResult migrationResult = new MigrationResult();
            migrationResult.error = error;
            return migrationResult;
        }

        public static MigrationResult configMigrationFailed(String error) {
            MigrationResult migrationResult = new MigrationResult();
            migrationResult.requirementsMet = true;
            migrationResult.error = error;
            return migrationResult;
        }

        public static MigrationResult databaseMigrationFailed(String error, List<String> messages) {
            MigrationResult migrationResult = new MigrationResult();
            migrationResult.requirementsMet = true;
            migrationResult.configMigrated = true;
            migrationResult.warningMessages = messages;
            migrationResult.error = error;
            return migrationResult;
        }

        public static MigrationResult migrationSuccessful(List<String> messages) {
            MigrationResult migrationResult = new MigrationResult();
            migrationResult.requirementsMet = true;
            migrationResult.configMigrated = true;
            migrationResult.databaseMigrated = true;
            migrationResult.warningMessages = messages;
            return migrationResult;
        }

    }

}
