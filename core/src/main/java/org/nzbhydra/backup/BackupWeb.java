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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
    @GetMapping(value = "/internalapi/backup/backup", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @Transactional
    public Object backupAndDownload() throws Exception {
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
    @GetMapping("/internalapi/backup/backuponly")
    @Transactional
    public GenericResponse backupOnly() throws Exception {
        try {
            backup.backup(true);
            return GenericResponse.ok();
        } catch (Exception e) {
            logger.error("Error while creating backup", e);
            return GenericResponse.notOk(e.getMessage());
        }
    }

    @Secured({"ROLE_ADMIN"})
    @GetMapping("/internalapi/backup/list")
    public List<BackupEntry> listBackups() throws Exception {
        return backup.getExistingBackups();
    }

    @Secured({"ROLE_ADMIN"})
    @GetMapping("/internalapi/backup/restore")
    public GenericResponse restore(@RequestParam String filename) throws Exception {
        if (!isValidBackupFile(filename)) {
            throw new IllegalArgumentException("Invalid backup file: " + filename);
        }
        return backup.restore(filename);
    }

    @Secured({"ROLE_ADMIN"})
    @PostMapping("/internalapi/backup/restorefile")
    public GenericResponse restoreFromUpload(@RequestParam("file") MultipartFile file) throws Exception {
        return backup.restoreFromFile(file.getInputStream());
    }

    @Secured({"ROLE_ADMIN"})
    @GetMapping(value = "/internalapi/backup/download", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public FileSystemResource getFile(@RequestParam("filename") String filename) throws Exception {
        if (!isValidBackupFile(filename)) {
            throw new IllegalArgumentException("Invalid backup file: " + filename);
        }
        return new FileSystemResource(new File(backup.getBackupFolder(), filename));
    }

    private boolean isValidBackupFile(String filename) {
        return backup.getExistingBackups().stream()
                .anyMatch(entry -> entry.getFilename().equals(filename));
    }

}
