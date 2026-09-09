package org.nzbhydra.externalapi;

import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.externalapi.v1.ExternalBackupEntry;
import org.springframework.stereotype.Component;

import java.io.File;

/**
 * Maps the internal backup entries to the contract class. The size is read from the file itself because
 * {@code BackupEntry} does not carry it.
 */
@Component
public class ExternalBackupMapper {

    public ExternalBackupEntry toExternalBackupEntry(BackupEntry entry, File backupFolder) {
        File file = new File(backupFolder, entry.getFilename());
        return new ExternalBackupEntry(entry.getFilename(), entry.getCreationDate(), file.length());
    }
}
