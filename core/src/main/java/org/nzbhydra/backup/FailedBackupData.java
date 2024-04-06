package org.nzbhydra.backup;

import lombok.Getter;
import lombok.Setter;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.time.LocalDateTime;


@Getter
@ReflectionMarker
public class FailedBackupData implements Serializable {

    private final LocalDateTime time = LocalDateTime.now();
    @Setter
    private boolean shown;
    @Setter
    private String message;


    public FailedBackupData() {
    }

    public FailedBackupData(String message) {
        this.message = message;
    }

}
