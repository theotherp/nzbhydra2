package org.nzbhydra.backup;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.time.LocalDateTime;


@Setter
@Getter
@ReflectionMarker
public class BackupData implements Serializable {

    protected LocalDateTime lastBackup;

    public BackupData(LocalDateTime lastBackup) {
        this.lastBackup = lastBackup;
    }

    public BackupData() {
        this.lastBackup = LocalDateTime.now();
    }

}
