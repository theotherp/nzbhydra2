

package org.nzbhydra.downloading;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DownloadException extends Exception {

    private String url;
    private int status;
    private String message;

}
