package org.nzbhydra.debuginfos;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.logging.LogContentProvider;
import org.nzbhydra.logging.LogContentProvider.JsonLogResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.util.List;

@RestController
public class DebugInfosWeb {

    @Autowired
    private LogContentProvider logContentProvider;
    @Autowired
    private org.nzbhydra.debuginfos.DebugInfosProvider debugInfos;

    private static final Logger logger = LoggerFactory.getLogger(DebugInfosWeb.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/currentlogfile", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public FileSystemResource getCurrentLogFile() {
        return new FileSystemResource(logContentProvider.getCurrentLogfile(false));
    }


    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/downloadlog", method = RequestMethod.GET, produces = MediaType.TEXT_PLAIN_VALUE)
    public FileSystemResource downloadLogFile(@RequestParam String logfilename) {
        File file = new File(new File(NzbHydra.getDataFolder(), "logs"), logfilename);
        return new FileSystemResource(file);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/logfilenames", method = RequestMethod.GET)
    public List<String> getLogFilenames() {
        return logContentProvider.getLogFileNames();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/jsonlogs", method = RequestMethod.GET)
    public ResponseEntity<JsonLogResponse> logsAsJson(@RequestParam(required = false) Integer offset, @RequestParam(required = false) Integer limit) {
        try {
            JsonLogResponse jsonObjects = logContentProvider.getLogsAsJsonLines(offset == null ? 0 : offset, limit == null ? 500 : limit);
            return ResponseEntity.ok(jsonObjects);
        } catch (IOException e) {
            logger.error("Error while getting log file content", e);
            return ResponseEntity.status(500).build();
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
    @RequestMapping(value = "/internalapi/debuginfos/executesqlquery", method = RequestMethod.POST)
    public GenericResponse executeSqlQuery(@RequestBody String sql) throws IOException {
        try {
            return GenericResponse.ok(debugInfos.executeSqlQuery(sql));
        } catch (IOException e) {
            logger.error("Error while executing SQL", e);
            return GenericResponse.notOk("Error while executing SQL " + e.getMessage());
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/debuginfos/executesqlupdate", method = RequestMethod.POST)
    public GenericResponse executeSqlUpdate(@RequestBody String sql) throws IOException {
        try {
            return GenericResponse.ok(debugInfos.executeSqlUpdate(sql));
        } catch (IOException e) {
            logger.error("Error while executing SQL", e);
            return GenericResponse.notOk("Error while executing SQL " + e.getMessage());
        }
    }


}
