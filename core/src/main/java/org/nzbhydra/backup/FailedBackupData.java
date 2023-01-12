package org.nzbhydra.backup;

import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.time.LocalDateTime;


@ReflectionMarker
public class FailedBackupData implements Serializable {

    private final LocalDateTime time = LocalDateTime.now();
    private boolean shown;
    private String message;


    public FailedBackupData() {
    }

    public FailedBackupData(String message) {
        this.message = message;
    }

    public boolean isShown() {
        return shown;
    }

    public void setShown(boolean shown) {
        this.shown = shown;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getTime() {
        return time;
    }


}
