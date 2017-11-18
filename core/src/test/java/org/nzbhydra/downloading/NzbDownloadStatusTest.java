package org.nzbhydra.downloading;

import org.junit.Test;

import static org.junit.Assert.assertTrue;

public class NzbDownloadStatusTest {

    @Test
    public void testCanUpdate() {
        assertTrue(NzbDownloadStatus.NZB_ADDED.canUpdate(NzbDownloadStatus.NONE));
        assertTrue(NzbDownloadStatus.NZB_ADDED.canUpdate(NzbDownloadStatus.REQUESTED));
        assertTrue(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL.canUpdate(NzbDownloadStatus.REQUESTED));
        assertTrue(NzbDownloadStatus.NZB_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.NONE));
        assertTrue(NzbDownloadStatus.NZB_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.REQUESTED));
        assertTrue(NzbDownloadStatus.NZB_ADD_REJECTED.canUpdate(NzbDownloadStatus.REQUESTED));
        assertTrue(NzbDownloadStatus.NZB_ADD_REJECTED.canUpdate(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL));
        assertTrue(NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.NONE));
        assertTrue(NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL));
        assertTrue(NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.NZB_ADDED));
        assertTrue(NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR.canUpdate(NzbDownloadStatus.REQUESTED));
    }


}