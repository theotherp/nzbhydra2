/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.google.common.collect.Iterables;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
@Builder
public class DownloaderStatus {

    public enum State {
        IDLE,
        DOWNLOADING,
        PAUSED,
        OFFLINE,
        NONE_ENABLED
    }

    private String downloaderName;
    private DownloaderType downloaderType;
    private int elementsInQueue;
    private String downloadingTitle;

    @JsonSerialize(using = ToStringSerializer.class)
    private long downloadingTitleRemainingSizeKilobytes;
    @JsonSerialize(using = ToStringSerializer.class)
    private long downloadingTitleRemainingTimeSeconds;

    private int downloadingTitlePercentFinished;

    private long downloadRateInKilobytes;
    @Builder.Default
    private List<Long> downloadingRatesInKilobytes = new ArrayList<>();
    private Long lastDownloadRate;

    private long remainingSeconds;
    private long remainingSizeInMegaBytes;

    private State state;

    private String url;

    private boolean lastUpdateForNow;

    public Long getLastDownloadRate() {
        return downloadingRatesInKilobytes.isEmpty() ? 1L : Iterables.getLast(downloadingRatesInKilobytes);
    }

    public String getDownloadRateFormatted() {
        return downloadRateInKilobytes == 0 ? "" : Converters.formatBytesPerSecond(downloadRateInKilobytes * 1024, false);
    }

    public String getRemainingSizeFormatted() {
        return remainingSizeInMegaBytes == 0 ? "" : Converters.formatMegabytes(remainingSizeInMegaBytes, false);
    }

    public String getRemainingTimeFormatted() {
        return Converters.formatTime(remainingSeconds);
    }

    public String getDownloadingTitleRemainingTimeFormatted() {
        return downloadingTitleRemainingTimeSeconds == 0 ? "" : Converters.formatTime(downloadingTitleRemainingTimeSeconds);
    }

    public List<Long> getDownloadingRatesInKilobytes() {
        if (downloadingRatesInKilobytes.isEmpty() || downloadingRatesInKilobytes.size() < 5) {
            return downloadingRatesInKilobytes;
        }
        if (downloadingRatesInKilobytes.get(downloadingRatesInKilobytes.size() - 1) / (float) 10 > downloadingRatesInKilobytes.get(downloadingRatesInKilobytes.size() - 2)) {
            //Latest rate is a lot larger than the one before
            //If it's also a lot larger than the third last we ignore the last one we don't return the latest one
            if (downloadingRatesInKilobytes.get(downloadingRatesInKilobytes.size() - 1) / (float) 10 > downloadingRatesInKilobytes.get(downloadingRatesInKilobytes.size() - 3)) {
                return downloadingRatesInKilobytes.subList(0, downloadingRatesInKilobytes.size() - 1);
            }
        }
        return downloadingRatesInKilobytes;
    }


    @Data
    @ReflectionMarker
    @AllArgsConstructor
    static class DownloadRate {
        private long x;
        private long y;
    }

}
