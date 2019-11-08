/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading;

import lombok.Data;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Data
public class DownloadResult {
    private byte[] content;
    private String url;
    private String title;
    private boolean successful;
    private String error;
    private FileDownloadEntity downloadEntity;
    private HttpStatus statusCode;

    private static final Pattern URL_PARAM_PATTERN = Pattern.compile("dn=([^&$]+)");

    protected DownloadResult(String title, byte[] content, String url, boolean successful, String error, FileDownloadEntity downloadEntity) {
        this.content = content;
        this.title = title;
        this.url = url;
        this.successful = successful;
        this.error = error;
        this.downloadEntity = downloadEntity;
        this.statusCode = HttpStatus.OK;
    }

    protected DownloadResult(String title, byte[] content, String url, boolean successful, String error, HttpStatus statusCode, FileDownloadEntity downloadEntity) {
        this(title, content, url, successful, error, downloadEntity);
        this.statusCode = statusCode;
    }

    public boolean isRedirect() {
        return url != null;
    }

    protected String getFileName() {
        String filename = title;
        if (downloadEntity.getSearchResult().getDownloadType() == SearchResultItem.DownloadType.NZB) {
            filename += ".nzb";
        } else {
            filename += ".torrent";
        }
        return filename;
    }

    public ResponseEntity<Object> getAsResponseEntity() {
        ResponseEntity<Object> response;
        if (statusCode != HttpStatus.OK) {
            if (statusCode == HttpStatus.TOO_MANY_REQUESTS || statusCode == HttpStatus.INTERNAL_SERVER_ERROR) {
                //In case of an internal server error we just hope that it works later again...
                HttpHeaders headers = new HttpHeaders();
                //Retry after 4 hours by default. Ideally we would know this (see IndexerForSearchSelector), but that would require a DB access and so on. This hardcoded value should be good enough for most cases.
                headers.add(HttpHeaders.RETRY_AFTER, String.valueOf(60 * 60 * 4));
                response = new ResponseEntity<>(error, headers, HttpStatus.TOO_MANY_REQUESTS);
            } else {
                response = new ResponseEntity<>(error, statusCode);
            }
        } else if (isRedirect()) {
            HttpHeaders headers = new HttpHeaders();
            //Jackett doesn't properly encode magnet URLs. Completely encoding it would  destroy the magnet link
            String url = getCleanedUrl();
            headers.setLocation(URI.create(url));
            response = new ResponseEntity<>(headers, HttpStatus.FOUND);
        } else {
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + getFileName().replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
            response = new ResponseEntity<>(getContent(), headers, HttpStatus.OK);
        }
        return response;
    }

    public String getCleanedUrl() {
        if (!url.contains("magnet:")) {
            return url;
        }
        Matcher matcher = URL_PARAM_PATTERN.matcher(url);
        if (!matcher.find()) {
            return url;
        }
        String dn = matcher.group(1);
        url = url.replace("dn=" + dn, "dn=" + URLEncoder.encode(dn)).replace(" ", "%20");
        return url;
    }

    public static DownloadResult createSuccessfulDownloadResult(String title, byte[] content, FileDownloadEntity entity) {
        return new DownloadResult(title, content, null, true, null, entity);
    }

    public static DownloadResult createSuccessfulRedirectResult(String title, String url, FileDownloadEntity entity) {
        return new DownloadResult(title, null, url, true, null, entity);
    }

    public static DownloadResult createErrorResult(String error, FileDownloadEntity entity) {
        return new DownloadResult(null, null, null, false, error, entity);
    }

    public static DownloadResult createErrorResult(String error) {
        return new DownloadResult(null, null, null, false, error, null);
    }

    public static DownloadResult createErrorResult(String error, HttpStatus httpStatus, FileDownloadEntity entity) {
        return new DownloadResult(null, null, null, false, error, httpStatus, entity);
    }


}
