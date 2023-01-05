package org.nzbhydra.backup;

import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.time.LocalDateTime;


@ReflectionMarker
public class BackupData implements Serializable {

    protected LocalDateTime lastBackup;

    public BackupData(LocalDateTime lastBackup) {
        this.lastBackup = lastBackup;
    }

    public BackupData() {
        this.lastBackup = LocalDateTime.now();
    }

    public LocalDateTime getLastBackup() {
        return lastBackup;
    }

    public void setLastBackup(LocalDateTime lastBackup) {
        this.lastBackup = lastBackup;
    }
}
