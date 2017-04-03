package org.nzbhydra.downloader;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConnectionCheckResult {

    private boolean successful;
    private String message;

}
