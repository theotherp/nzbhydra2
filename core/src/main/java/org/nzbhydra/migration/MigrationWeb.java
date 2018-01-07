package org.nzbhydra.migration;

import org.nzbhydra.migration.FromPythonMigration.MigrationMessageEvent;
import org.nzbhydra.migration.FromPythonMigration.MigrationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
public class MigrationWeb {

    @Autowired
    private FromPythonMigration migration;

    private List<String> messages = new ArrayList<>();

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/migration/url", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public MigrationResult migrateFromUrl(@RequestParam(name = "baseurl") String oldHydraBaseUrl, @RequestParam(name = "doMigrateDatabase") boolean doMigrateDatabase) throws IOException {
        messages.clear();
        return migration.migrateFromUrl(oldHydraBaseUrl, doMigrateDatabase);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/migration/files", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public MigrationResult migrateFromFiles(@RequestParam(name = "settingsCfgFile") String settingsFile, @RequestParam(name = "dbFile") String dbFile, @RequestParam(name = "doMigrateDatabase") boolean doMigrateDatabase) throws IOException {
        messages.clear();
        return migration.migrateFromFiles(settingsFile, dbFile, doMigrateDatabase);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/migration/messages", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<String> getMigrationMessages() {
        return messages;
    }

    @EventListener
    public void handleMigrationMessageEvent(MigrationMessageEvent event) {
        messages.add(event.getMessage());
    }


}
