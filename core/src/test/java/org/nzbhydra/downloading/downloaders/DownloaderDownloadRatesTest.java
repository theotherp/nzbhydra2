package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.GenericResponse;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DownloaderDownloadRatesTest {

    private TestDownloader testee;

    @BeforeEach
    void setUp() {
        testee = new TestDownloader();
    }

    @Test
    void shouldReturnSnapshotOfDownloadRatesWhichIsNotChangedByLaterUpdates() {
        testee.addDownloadRate(100L);
        testee.addDownloadRate(200L);

        List<Long> rates = testee.getDownloadRates();
        testee.addDownloadRate(300L);

        assertThat(rates).containsExactly(100L, 200L);
    }

    @Test
    void shouldNotAllowModificationOfTheInternalList() {
        testee.addDownloadRate(100L);

        List<Long> rates = testee.getDownloadRates();

        assertThat(rates).isNotSameAs(testee.getDownloadRates());
        assertThatThrownBy(() -> rates.add(1L)).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void shouldKeepOnlyTheLatestRates() {
        for (int i = 0; i < 350; i++) {
            testee.addDownloadRate(i);
        }

        assertThat(testee.getDownloadRates()).hasSize(300);
        assertThat(testee.getDownloadRates().get(299)).isEqualTo(349L);
    }

    private static class TestDownloader extends Downloader {

        TestDownloader() {
            super(null, null, null, null, null, null);
        }

        @Override
        public GenericResponse checkConnection() {
            return null;
        }

        @Override
        public List<String> getCategories() {
            return Collections.emptyList();
        }

        @Override
        public String addLink(String link, String title, DownloadType downloadType, String category) throws DownloaderException {
            return null;
        }

        @Override
        public String addContent(byte[] content, String title, DownloadType downloadType, String category) throws DownloaderException {
            return null;
        }

        @Override
        public DownloaderStatus getStatus() throws DownloaderException {
            return null;
        }

        @Override
        public List<DownloaderEntry> getHistory(Instant earliestDownload) throws DownloaderException {
            return Collections.emptyList();
        }

        @Override
        public List<DownloaderEntry> getQueue(Instant earliestDownload) throws DownloaderException {
            return Collections.emptyList();
        }

        @Override
        protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
            return null;
        }
    }

}
