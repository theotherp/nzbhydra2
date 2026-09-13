package org.nzbhydra.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

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

}
