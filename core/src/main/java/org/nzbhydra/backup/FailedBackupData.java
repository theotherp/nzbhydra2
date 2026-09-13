package org.nzbhydra.backup;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.time.LocalDateTime;


@ReflectionMarker
@EqualsAndHashCode
@Data
public class FailedBackupData implements Serializable {

    private final LocalDateTime time = LocalDateTime.now();
    private boolean shown;
    private String message;


    public FailedBackupData() {
    }

    public FailedBackupData(String message) {
        this.message = message;
    }

}
