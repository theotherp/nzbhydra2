package org.nzbhydra.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.update.SemanticVersion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
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
    private BackupAndRestore backupAndRestore;
    protected TypeReference<Map<String, String>> mapTypeReference = new TypeReference<Map<String, String>>() {
    };

    @Transactional
    public MigrationResult migrate(String nzbhydra1BaseUrl) {
        logger.info("Received migration reuest");
        try {
            backupAndRestore.backup();
        } catch (Exception e) {
            logger.error("Error while creating backup before migrating from NZBHydra 1", e);
            return MigrationResult.requirementsNotMet("Unable to create backup before migration: " + e.getMessage());
        }

        OkHttpResponse versionsResponse = callHydraUrl(nzbhydra1BaseUrl, "get_versions");
        if (!versionsResponse.isSuccessful()) {
            String msg = "Unable to connect to NZBHydra 1: " + versionsResponse.getMessage();
            logger.error(msg);
            return MigrationResult.requirementsNotMet(msg);
        }

        Map<String, String> migrationData = null;
        try {
            Map<String, String> versionsData = new ObjectMapper().readValue(versionsResponse.getBody(), mapTypeReference);
            String currentVersionString = versionsData.get("currentVersion");
            SemanticVersion currentVersion = new SemanticVersion(currentVersionString);
            if (currentVersion.compareTo(new SemanticVersion("0.2.219")) < 0) {
                String msg = "Unable to migrate from NZBHydra 1 version " + currentVersionString + ". Must be at least 0.2.219";
                logger.error(msg);
                return MigrationResult.requirementsNotMet(msg);
            }
            OkHttpResponse migrationResponse = callHydraUrl(nzbhydra1BaseUrl, "migration");
            migrationData = new ObjectMapper().readValue(migrationResponse.getBody(), mapTypeReference);
        } catch (Exception e) {
            logger.error("Unexpected error while migrating", e);
            return MigrationResult.requirementsNotMet("Unexpected error while migrating: " + e.getMessage());
        }

        List<String> configMigrationMessages;
        try {
            configMigrationMessages = configMigration.migrate(migrationData.get("config")).getMessages();
        } catch (Exception e) {
            logger.error("Unrecoverable error while migrating config", e);
            return MigrationResult.configMigrationFailed("Unrecoverable error while migrating config: " + e.getMessage());
        }

        try {
            sqliteMigration.migrate(migrationData.get("databaseFile"));
        } catch (Exception e) {
            logger.error("Error while migrating database", e);
            return MigrationResult.databaseMigrationFailed("Error while migrating database: " + e.getMessage(), configMigrationMessages);
        }
        return MigrationResult.migrationSuccessful(configMigrationMessages);
    }

    protected OkHttpResponse callHydraUrl(String nzbhydra1BaseUrl, String internalApiPath) {
        try {
            UriComponentsBuilder migrationBuilder = UriComponentsBuilder.fromHttpUrl(nzbhydra1BaseUrl);
            migrationBuilder.pathSegment("internalapi", internalApiPath).toUriString();
            String url = migrationBuilder.toUriString();
            logger.info("Connecting to URL {}", url);
            OkHttpClient client = new OkHttpClient.Builder().build();
            Request request = new Builder().url(url).build();
            Response response = client.newCall(request).execute();
            return new OkHttpResponse(response.body().string(), response.isSuccessful(), response.message());
        } catch (Exception e) {
            return new OkHttpResponse("", false, e.getMessage());
        }
    }

    @Data
    @AllArgsConstructor
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
