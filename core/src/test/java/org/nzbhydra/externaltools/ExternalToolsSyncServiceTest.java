package org.nzbhydra.externaltools;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.notifications.ExternalToolConfigResultEvent;
import org.nzbhydra.notifications.NotificationEvent;
import org.nzbhydra.notifications.NotificationHandler;
import org.nzbhydra.notifications.NotificationRepository;
import org.nzbhydra.web.UrlCalculator;
import org.nzbhydra.webaccess.WebAccessException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * ADR-0019's addendum: a per-tool sync failure is returned to the user in {@code POST .../syncAll}'s {@code messages}
 * list, so a {@link WebAccessException} contributes its short form there while any other exception keeps its full
 * message. The persisted sync notification's body is the generic count text and is unaffected either way.
 */
@MockitoSettings(strictness = Strictness.LENIENT)
class ExternalToolsSyncServiceTest {

    @Mock
    private ExternalTools externalToolsMock;
    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private UrlCalculator urlCalculatorMock;
    @Mock
    private NotificationRepository notificationRepositoryMock;
    @Mock
    private NotificationHandler notificationHandlerMock;
    @Captor
    private ArgumentCaptor<NotificationEvent> notificationCaptor;

    @InjectMocks
    private ExternalToolsSyncService testee = new ExternalToolsSyncService();

    private BaseConfig baseConfig;

    @BeforeEach
    void setUp() {
        baseConfig = new BaseConfig();
        baseConfig.getExternalTools().setSyncOnConfigChange(true);
        ExternalToolConfig tool = new ExternalToolConfig();
        tool.setName("Sonarr");
        tool.setType(ExternalToolConfig.ExternalToolType.SONARR);
        tool.setHost("http://127.0.0.1:8989");
        tool.setApiKey("apikey");
        tool.setEnabled(true);
        baseConfig.getExternalTools().getExternalTools().add(tool);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    void shouldNotIncludeResponseBodyInSyncFailureMessage() throws Exception {
        String longJsonBody = "{\"message\":\"Failed to add indexer\",\"description\":\"" + "x".repeat(2000) + "\"}";
        when(externalToolsMock.addNzbhydraAsIndexer(any())).thenThrow(new WebAccessException("Internal Server Error", longJsonBody, 500));

        ExternalToolsSyncService.SyncResult result = testee.syncTools(null);

        assertThat(result.getFailureCount()).isEqualTo(1);
        assertThat(result.getSuccessCount()).isZero();
        assertThat(result.getMessages()).containsExactly("Failed to sync to Sonarr: Internal Server Error. Code: 500");
        assertThat(result.getMessages().get(0)).doesNotContain("{");
        assertThat(result.getMessages().get(0)).endsWith("Code: 500");
    }

    @Test
    void shouldKeepFullMessageForNonWebAccessException() throws Exception {
        when(externalToolsMock.addNzbhydraAsIndexer(any())).thenThrow(new IOException("Some other failure with a long explanation"));

        ExternalToolsSyncService.SyncResult result = testee.syncTools(null);

        assertThat(result.getFailureCount()).isEqualTo(1);
        assertThat(result.getMessages()).containsExactly("Failed to sync to Sonarr: Some other failure with a long explanation");
    }

    /**
     * {@code createNotification} builds its body from the success/failure counts alone; its {@code messages} parameter
     * is not used for the body. Asserting the exact body for a failure whose message carries a distinctive body string
     * shows the notification is unchanged by ADR-0019 and that nothing from the messages list reaches it.
     */
    @Test
    void shouldLeaveNotificationBodyAtGenericCountText() throws Exception {
        when(externalToolsMock.addNzbhydraAsIndexer(any())).thenThrow(new WebAccessException("Internal Server Error", "{\"detail\":\"distinctive body text\"}", 500));

        testee.syncTools(null);

        verify(notificationHandlerMock).handleNotification(notificationCaptor.capture());
        NotificationEvent event = notificationCaptor.getValue();
        assertThat(event).isInstanceOf(ExternalToolConfigResultEvent.class);
        assertThat(((ExternalToolConfigResultEvent) event).getBody()).isEqualTo("Failed to sync to 1 external tool(s). Check logs for details.");
        assertThat(((ExternalToolConfigResultEvent) event).getBody()).doesNotContain("distinctive body text");
        assertThat(((ExternalToolConfigResultEvent) event).getBody()).doesNotContain("Internal Server Error");
    }

    @Test
    void shouldReportSuccessWithoutMessagesFromExternalTools() throws Exception {
        when(externalToolsMock.addNzbhydraAsIndexer(any())).thenReturn(true);

        ExternalToolsSyncService.SyncResult result = testee.syncTools(null);

        assertThat(result.getSuccessCount()).isEqualTo(1);
        assertThat(result.getFailureCount()).isZero();
        assertThat(result.getMessages()).containsExactly("Successfully synced to Sonarr");
    }

    @Test
    void shouldDoNothingWhenSyncIsDisabled() throws Exception {
        baseConfig.getExternalTools().setSyncOnConfigChange(false);

        ExternalToolsSyncService.SyncResult result = testee.syncTools(null);

        assertThat(result.getSuccessCount()).isZero();
        assertThat(result.getFailureCount()).isZero();
        assertThat(result.getMessages()).isEmpty();
    }
}
