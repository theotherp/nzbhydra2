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

package org.nzbhydra.downloading.downloaders;

import com.google.common.collect.Iterables;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.downloading.DownloaderType;

import java.util.ArrayList;
import java.util.List;

@Data
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
    private String downloadingTitleRemainingSizeFormatted;
    private String downloadingTitleRemainingTimeFormatted;
    private int downloadingTitlePercentFinished;

    private String downloadRateFormatted;
    private long downloadRateInKilobytes;
    private List<Long> downloadingRatesInKilobytes = new ArrayList<>();
    private Long lastDownloadRate;

    private String remainingTimeFormatted;
    private long remainingSeconds;

    private String remainingSizeFormatted;
    private long remainingSizeInMegaBytes;

    private State state;

    public Long getLastDownloadRate() {
        return downloadingRatesInKilobytes.isEmpty() ? 1L : Iterables.getLast(downloadingRatesInKilobytes);
    }

    public String getDownloadRateFormatted() {
        return Converters.formatBytesPerSecond(downloadRateInKilobytes * 1024, false);
    }

    public String getRemainingSizeFormatted() {
        return Converters.formatMegabytes(remainingSizeInMegaBytes, false);
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
    @AllArgsConstructor
    static class DownloadRate {
        private long x;
        private long y;
    }

}
