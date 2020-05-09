/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

import lombok.Getter;
import org.nzbhydra.searching.db.SearchResultEntity;

@Getter
public class FileDownloadEvent {

    private final long searchResultEntityId;
    private final int downloadEntityId;

    private final FileDownloadEntity fileDownloadEntity;

    private final SearchResultEntity searchResultEntity;


    public FileDownloadEvent(FileDownloadEntity fileDownloadEntity, SearchResultEntity searchResultEntityHasDownloaded) {
        this.downloadEntityId = fileDownloadEntity.getId();
        this.searchResultEntityId = searchResultEntityHasDownloaded.getId();
        this.fileDownloadEntity = fileDownloadEntity;
        this.searchResultEntity = searchResultEntityHasDownloaded;
    }
}
