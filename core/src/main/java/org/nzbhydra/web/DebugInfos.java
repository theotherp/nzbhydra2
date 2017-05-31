package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.logging.LogContentProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class DebugInfos {

    @Autowired
    private LogContentProvider logContentProvider;
    @Autowired
    private org.nzbhydra.debuginfos.DebugInfosProvider debugInfos;

    private static final Logger logger = LoggerFactory.getLogger(DebugInfos.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logfilecontent", method = RequestMethod.GET)
    public GenericResponse logfileContent() {
        try {
            return GenericResponse.ok(logContentProvider.getLog());
        } catch (IOException e) {
            logger.error("Error while getting log file content", e);
            return GenericResponse.notOk(e.getMessage());
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logandconfig", produces = "application/zip", method = RequestMethod.GET)
    public byte[] logAndInfosAsZip() throws IOException {
        try {
            return debugInfos.getDebugInfosAsZip();
        } catch (IOException e) {
            logger.error("Error while getting debug infos", e);
            throw e;
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/executesql", method = RequestMethod.POST)
    public GenericResponse executeSql(@RequestBody String sql) throws IOException {
        try {
            return GenericResponse.ok(debugInfos.executeSql(sql));
        } catch (IOException e) {
            logger.error("Error while executing SQL", e);
            return GenericResponse.notOk("Error while executing SQL " + e.getMessage());
        }
    }


}
