

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
}