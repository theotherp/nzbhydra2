

package org.nzbhydra.downloading.downloaders;

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

    private long downloadingTitleRemainingSizeKilobytes;

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
