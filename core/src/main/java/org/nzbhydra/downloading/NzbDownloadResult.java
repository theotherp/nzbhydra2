package org.nzbhydra.downloading;

import lombok.Data;
import org.nzbhydra.searching.SearchResultItem;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;

@Data
public class NzbDownloadResult {
    private byte[] nzbContent;
    private String url;
    private String title;
    private boolean successful;
    private String error;
    private NzbDownloadEntity downloadEntity;
    private int statusCode;

    private NzbDownloadResult(String title, byte[] nzbContent, String url, boolean successful, String error, NzbDownloadEntity downloadEntity) {
        this.nzbContent = nzbContent;
        this.title = title;
        this.url = url;
        this.successful = successful;
        this.error = error;
        this.downloadEntity = downloadEntity;
    }

    private NzbDownloadResult(String title, byte[] nzbContent, String url, boolean successful, String error, int statusCode, NzbDownloadEntity downloadEntity) {
        this(title, nzbContent, url, successful, error, downloadEntity);
        this.statusCode = statusCode;
    }

    public boolean isRedirect() {
        return url != null;
    }

    public ResponseEntity<Object> getAsResponseEntity() {
        ResponseEntity<Object> response;
        if (isRedirect()) {
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(URI.create(getUrl()));
            response = new ResponseEntity<>(headers, HttpStatus.FOUND);
        } else {
            HttpHeaders headers = new HttpHeaders();
            String filename = title;
            if (downloadEntity.getSearchResult().getDownloadType() == SearchResultItem.DownloadType.NZB) {
                filename  += ".nzb";
            } else {
                filename  += ".torrent";
            }
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
            response = new ResponseEntity<>(getNzbContent(), headers, HttpStatus.OK);
        }
        return response;
    }

    public static NzbDownloadResult createSuccessfulDownloadResult(String title, byte[] nzbContent, NzbDownloadEntity entity) {
        return new NzbDownloadResult(title, nzbContent, null, true, null, entity);
    }

    public static NzbDownloadResult createSuccessfulRedirectResult(String title, String url, NzbDownloadEntity entity) {
        return new NzbDownloadResult(title, null, url, true, null, entity);
    }

    public static NzbDownloadResult createErrorResult(String error, NzbDownloadEntity entity) {
        return new NzbDownloadResult(null, null, null, false, error, entity);
    }

    public static NzbDownloadResult createErrorResult(String error, int statusCode, NzbDownloadEntity entity) {
        return new NzbDownloadResult(null, null, null, false, error, statusCode, entity);
    }


}
