package org.nzbhydra;

import lombok.Data;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;

@Data
public class NzbDownloadResult {
    private String nzbContent;
    private String url;
    private String title;
    private boolean successful;
    private String error;

    private NzbDownloadResult(String title, String nzbContent, String url, boolean successful, String error) {
        this.nzbContent = nzbContent;
        this.title = title;
        this.url = url;
        this.successful = successful;
        this.error = error;
    }

    public boolean isRedirect() {
        return url != null;
    }

    public ResponseEntity<String> getAsResponseEntity() {
        ResponseEntity<String> response;
        if (isRedirect()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(getUrl()));
            response = new ResponseEntity<>(headers, HttpStatus.TEMPORARY_REDIRECT);
        } else {
            response = new ResponseEntity<>(getNzbContent(), HttpStatus.OK);
        }
        return response;
    }

    public static NzbDownloadResult createSuccessfulDownloadResult(String title, String nzbContent) {
        return new NzbDownloadResult(title, nzbContent, null, true, null);
    }

    public static NzbDownloadResult createSuccessfulRedirectResult(String title, String url) {
        return new NzbDownloadResult(title, null, url, true, null);
    }

    public static NzbDownloadResult createErrorResult(String error) {
        return new NzbDownloadResult(null, null, null, false, error);
    }


}
