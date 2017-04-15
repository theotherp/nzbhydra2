package org.nzbhydra.web;

import org.nzbhydra.GenericResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;

@RestController
public class Backup {

    @Autowired
    private org.nzbhydra.backup.BackupAndRestore backup;

    private static final Logger logger = LoggerFactory.getLogger(Backup.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/backup", method = RequestMethod.GET, produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @Transactional
    public Object backup() throws Exception {
        logger.info("Creating backup");
        try {
            File backupFile = backup.backup();
            logger.debug("Sending contents of file {}", backupFile.getAbsolutePath());
            return ResponseEntity
                    .ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + backupFile.getName())
                    .contentLength(backupFile.length())
                    .body(new FileSystemResource(backupFile));
        } catch (Exception e) {
            logger.error("Error while creating backup", e);
            return GenericResponse.notOk(e.getMessage());
        }
    }


}
