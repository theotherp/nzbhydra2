package org.nzbhydra.problemdetection;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.notifications.IndexerVipExpiryNotificationEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
public class VipExpiryDetectorTest {

    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private GenericStorage genericStorageMock;
    @Mock
    private ApplicationEventPublisher applicationEventPublisherMock;

    @InjectMocks
    private VipExpiryDetector testee = new VipExpiryDetector();

    private final Map<String, String> storage = new HashMap<>();

    @BeforeEach
    public void setUp() {
        BaseConfig baseConfig = new BaseConfig();
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("indexer1");
        indexerConfig.setVipExpirationDate(LocalDate.now().plusDays(3).toString());
        baseConfig.setIndexers(List.of(indexerConfig));
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);

        //Round-trip through the real JSON mapper like GenericStorage does
        when(genericStorageMock.get(anyString(), any())).thenAnswer(invocation -> {
            String json = storage.get(invocation.<String>getArgument(0));
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(Jackson.JSON_MAPPER.readValue(json, invocation.<Class<?>>getArgument(1)));
        });
        org.mockito.Mockito.doAnswer(invocation -> {
            storage.put(invocation.getArgument(0), Jackson.JSON_MAPPER.writeValueAsString(invocation.<Serializable>getArgument(1)));
            return null;
        }).when(genericStorageMock).save(anyString(), any());
    }

    @Test
    void shouldNotifyOnlyOncePerIndexerAndExpiryDate() {
        testee.executeCheck();
        testee.executeCheck();
        testee.executeCheck();

        verify(applicationEventPublisherMock, times(1)).publishEvent(any(IndexerVipExpiryNotificationEvent.class));
    }
}
