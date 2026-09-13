

package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

public class DownloaderStatusTest {

    @InjectMocks
    private DownloaderStatus testee = new DownloaderStatus();


    @Test
    void getDownloadingRatesInKilobytes() {
        List<Long> list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactlyElementsOf(list);

        list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L, 50000L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactly(100L, 100L, 100L, 100L, 100L, 100L, 100L);

        list = new ArrayList<>(Arrays.asList(100L, 100L, 100L, 100L, 100L, 100L, 100L, 50000L, 50000L));
        testee.setDownloadingRatesInKilobytes(list);
        assertThat(testee.getDownloadingRatesInKilobytes()).containsExactlyElementsOf(list);

    }

    @Test
    void shouldFormatFreeDiskSpace() {
        testee.setFreeDiskSpaceBytes(1_319_413_953_331L); //1.2 TB
        testee.setFreeIncompleteDiskSpaceBytes(955L * 1024 * 1024 * 1024);
        assertThat(testee.getFreeDiskSpaceFormatted()).isEqualTo("1.2 TB");
        assertThat(testee.getFreeIncompleteDiskSpaceFormatted()).isEqualTo("955 GB");

        testee.setFreeDiskSpaceBytes(199L * 1024 * 1024);
        testee.setFreeIncompleteDiskSpaceBytes(null);
        assertThat(testee.getFreeDiskSpaceFormatted()).isEqualTo("199 MB");
        assertThat(testee.getFreeIncompleteDiskSpaceFormatted()).isEmpty();
    }

    @Test
    void shouldDetectQueueExceedingFreeDiskSpace() {
        testee.setRemainingSizeInMegaBytes(2048);
        testee.setFreeDiskSpaceBytes(3L * 1024 * 1024 * 1024);
        testee.setFreeIncompleteDiskSpaceBytes(3L * 1024 * 1024 * 1024);
        assertThat(testee.isQueueExceedsFreeDiskSpace()).isFalse();

        testee.setFreeDiskSpaceBytes(1024L * 1024 * 1024);
        assertThat(testee.isQueueExceedsFreeDiskSpace()).isTrue();

        testee.setFreeDiskSpaceBytes(3L * 1024 * 1024 * 1024);
        testee.setFreeIncompleteDiskSpaceBytes(1024L * 1024 * 1024);
        assertThat(testee.isQueueExceedsFreeDiskSpace()).isTrue();

        testee.setFreeDiskSpaceBytes(null);
        testee.setFreeIncompleteDiskSpaceBytes(null);
        assertThat(testee.isQueueExceedsFreeDiskSpace()).isFalse();

        testee.setRemainingSizeInMegaBytes(0);
        testee.setFreeDiskSpaceBytes(1L);
        assertThat(testee.isQueueExceedsFreeDiskSpace()).isFalse();
    }
}
