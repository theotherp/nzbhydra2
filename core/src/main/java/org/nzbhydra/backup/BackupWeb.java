package org.nzbhydra.backup;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.List;

@RestController
public class BackupWeb {

    @Autowired
    private org.nzbhydra.backup.BackupAndRestore backup;

    private static final Logger logger = LoggerFactory.getLogger(BackupWeb.class);

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/backup", method = RequestMethod.GET, produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @Transactional
    public Object backupAndDownload() {
        try {
            File backupFile = backup.backup(true);

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

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/backuponly", method = RequestMethod.GET)
    @Transactional
    public GenericResponse backupOnly() {
        try {
            backup.backup(true);
            return GenericResponse.ok();
        } catch (Exception e) {
            logger.error("Error while creating backup", e);
            return GenericResponse.notOk(e.getMessage());
        }
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/list", method = RequestMethod.GET)
    public List<BackupEntry> listBackups() {
        return backup.getExistingBackups();
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/restore", method = RequestMethod.GET)
    public GenericResponse restore(@RequestParam String filename) {
        return backup.restore(filename);
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/restorefile", method = RequestMethod.POST)
    public GenericResponse restoreFromUpload(@RequestParam("file") MultipartFile file) throws Exception {
        return backup.restoreFromFile(file.getInputStream());
    }

    @Secured({"ROLE_ADMIN"})
    @RequestMapping(value = "/internalapi/backup/download", method = RequestMethod.GET, produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public FileSystemResource getFile(@RequestParam("filename") String filename) {
        final FileSystemResource resource = new FileSystemResource(new File(backup.getBackupFolder(), filename));
        return resource;
    }

}
