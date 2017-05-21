package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.migration.FromPythonMigration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.sql.SQLException;

@RestController
public class Migration {

    @Autowired
    private FromPythonMigration migration;

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/migration", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public GenericResponse migrate(@RequestParam(name = "baseurl") String oldHydraBaseUrl) throws IOException {
        try {
            migration.migrate(oldHydraBaseUrl);
            return GenericResponse.ok();
        } catch (SQLException e) {
            return GenericResponse.notOk(e.getMessage());
        }
    }

}
