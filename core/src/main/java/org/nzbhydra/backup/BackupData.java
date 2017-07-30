package org.nzbhydra.backup;

import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
public class BackupData implements Serializable {

    protected LocalDateTime lastBackup;

    public BackupData() {
        this.lastBackup = LocalDateTime.now();
    }


}
