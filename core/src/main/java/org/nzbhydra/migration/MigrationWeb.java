package org.nzbhydra.migration;

import org.nzbhydra.migration.FromPythonMigration.MigrationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class MigrationWeb {

    private static final Logger logger = LoggerFactory.getLogger(MigrationWeb.class);

    @Autowired
    private FromPythonMigration migration;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/migration", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public MigrationResult migrate(@RequestParam(name = "baseurl") String oldHydraBaseUrl) throws IOException {
        return migration.migrate(oldHydraBaseUrl);
    }

}
