package org.nzbhydra.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BaseConfigHandlerTest {

    @Mock
    private ConfigReaderWriter configReaderWriterMock;

    @InjectMocks
    private BaseConfigHandler testee = new BaseConfigHandler();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(testee, "configReaderWriter", configReaderWriterMock);
        ReflectionTestUtils.setField(testee, "baseConfig", new BaseConfig());
    }

    @Test
    @Timeout(5)
    void shouldReleaseSaveLockWhenWritingConfigFails() throws Exception {
        doThrow(new RuntimeException("Unable to write config")).doNothing().when(configReaderWriterMock).save(any(BaseConfig.class));

        assertThatThrownBy(() -> testee.save(true))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Unable to write config");

        //Must be done in another thread because a ReentrantLock can always be reacquired by the thread holding it
        Thread otherThread = new Thread(() -> testee.save(true));
        otherThread.setDaemon(true);
        otherThread.start();
        otherThread.join(2000);

        assertThat(otherThread.isAlive()).isFalse();
        verify(configReaderWriterMock, times(2)).save(any(BaseConfig.class));
    }

    @Test
    @Timeout(5)
    void shouldNotFailOnShutdownWhenNoDelayedSaveTimerWasStarted() {
        doNothing().when(configReaderWriterMock).save(any(BaseConfig.class));
        testee.save(false);

        testee.onShutdown();

        verify(configReaderWriterMock, times(1)).save(any(BaseConfig.class));
    }

    @Test
    void shouldGiveRecordsWithoutOrWithDuplicateIdsAnIdWhenReplacingTheConfig() {
        final BaseConfig newConfig = new BaseConfig();
        final IndexerConfig first = new IndexerConfig();
        first.setName("first");
        first.setId("same");
        final IndexerConfig second = new IndexerConfig();
        second.setName("second");
        second.setId("same");
        newConfig.setIndexers(new ArrayList<>(List.of(first, second)));
        final UserAuthConfig user = new UserAuthConfig();
        newConfig.getAuth().setUsers(new ArrayList<>(List.of(user)));
        final DownloaderConfig downloader = new DownloaderConfig();
        downloader.setName("sab");
        newConfig.getDownloading().setDownloaders(new ArrayList<>(List.of(downloader)));

        testee.replace(newConfig, false);

        final BaseConfig live = (BaseConfig) ReflectionTestUtils.getField(testee, "baseConfig");
        assertThat(live.getIndexers()).extracting(IndexerConfig::getName).containsExactly("first", "second");
        assertThat(live.getIndexers().get(0).getId()).isEqualTo("same");
        assertThat(live.getIndexers().get(1).getId()).isNotBlank().isNotEqualTo("same");
        assertThat(live.getAuth().getUsers().get(0).getId()).isNotBlank();
        assertThat(live.getDownloading().getDownloaders().get(0).getId()).isNotBlank();
    }

}
