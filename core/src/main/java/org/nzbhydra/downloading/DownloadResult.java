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

import com.google.common.base.Splitter;
import lombok.Data;
import org.nzbhydra.searching.SearchResultItem;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.net.URLEncoder;
import java.util.Map;

@Data
public class DownloadResult {
    private byte[] content;
    private String url;
    private String title;
    private boolean successful;
    private String error;
    private FileDownloadEntity downloadEntity;
    private int statusCode;

    protected DownloadResult(String title, byte[] content, String url, boolean successful, String error, FileDownloadEntity downloadEntity) {
        this.content = content;
        this.title = title;
        this.url = url;
        this.successful = successful;
        this.error = error;
        this.downloadEntity = downloadEntity;
    }

    protected DownloadResult(String title, byte[] content, String url, boolean successful, String error, int statusCode, FileDownloadEntity downloadEntity) {
        this(title, content, url, successful, error, downloadEntity);
        this.statusCode = statusCode;
    }

    public boolean isRedirect() {
        return url != null;
    }

    protected String getFileName() {
        String filename = title;
        if (downloadEntity.getSearchResult().getDownloadType() == SearchResultItem.DownloadType.NZB) {
            filename  += ".nzb";
        } else {
            filename  += ".torrent";
        }
        return filename;
    }

    public ResponseEntity<Object> getAsResponseEntity() {
        ResponseEntity<Object> response;
        if (isRedirect()) {
            HttpHeaders headers = new HttpHeaders();
            //Jackett doesn't properly encode magnet URLs. Completely encoding it would  destroy the magnet link
            String url = getCleanedUrl();
            headers.setLocation(URI.create(url));
            response = new ResponseEntity<>(headers, HttpStatus.FOUND);
        } else {
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + getFileName());
            response = new ResponseEntity<>(getContent(), headers, HttpStatus.OK);
        }
        return response;
    }

    public String getCleanedUrl() {
        Map<String, String> map = Splitter.on('&').trimResults().withKeyValueSeparator("=").split(url);
        if (map.containsKey("dn")) {
            url = url.replace(map.get("dn"), URLEncoder.encode(map.get("dn")));
        }
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

    public static DownloadResult createErrorResult(String error, int statusCode, FileDownloadEntity entity) {
        return new DownloadResult(null, null, null, false, error, statusCode, entity);
    }


}
