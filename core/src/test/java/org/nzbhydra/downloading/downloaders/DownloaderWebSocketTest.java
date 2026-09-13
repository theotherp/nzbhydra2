package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class DownloaderWebSocketTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloaderStatusRetrieval downloaderStatusRetrieval;
    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @InjectMocks
    private DownloaderWebSocket testee = new DownloaderWebSocket();

    @Test
    void shouldKeepSendingUpdatesAfterAnErrorOnOneTick() {
        DownloaderStatus status = new DownloaderStatus();
        status.setState(DownloaderStatus.State.DOWNLOADING);
        when(downloaderStatusRetrieval.getStatus())
                .thenThrow(new RuntimeException("Some error while retrieving the status"))
                .thenReturn(status);

        testee.sendStatusUpdateCatchingErrors();
        testee.sendStatusUpdateCatchingErrors();

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/downloaderStatus"), any(Object.class));
    }

}
