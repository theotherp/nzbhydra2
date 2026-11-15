package org.nzbhydra.systemcontrol;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.ShutdownEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.ConfigurableEnvironment;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemControlTest {

    @Mock
    private ConfigurableEnvironment environment;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    @InjectMocks
    private SystemControl testee = new SystemControl();

    @TempDir
    Path dataFolder;

    private String dataFolderBefore;
    private final CompletableFuture<Exit> exit = new CompletableFuture<>();

    private record Exit(int returnCode, boolean daemon) {
    }

    @BeforeEach
    void setUp() {
        dataFolderBefore = NzbHydra.getDataFolder();
        NzbHydra.setDataFolder(dataFolder.toString());
        testee.contextCloserAndExiter = returnCode -> exit.complete(new Exit(returnCode, Thread.currentThread().isDaemon()));
    }

    @AfterEach
    void tearDown() {
        NzbHydra.setDataFolder(dataFolderBefore);
    }

    @Test
    void shouldExitFromNonDaemonThreadWhenCalledFromDaemonThread() throws Exception {
        when(environment.getProperty("hydradontshutdown", "false")).thenReturn("false");

        //Request threads are daemons. If the exit thread inherited that, the JVM would end with code 0 when the
        //context is closed, before System.exit(22) is reached, and the wrapper would not restart
        Thread requestThread = new Thread(() -> testee.exitWithReturnCode(SystemControl.RESTART_RETURN_CODE));
        requestThread.setDaemon(true);
        requestThread.start();
        requestThread.join();

        Exit result = exit.get(10, TimeUnit.SECONDS);
        assertThat(result.daemon()).isFalse();
        assertThat(result.returnCode()).isEqualTo(SystemControl.RESTART_RETURN_CODE);
        assertThat(Files.readString(dataFolder.resolve("control.id"))).isEqualTo("22");
        verify(applicationEventPublisher).publishEvent(any(ShutdownEvent.class));
    }

    @Test
    void shouldNotExitWhenShutdownIsDisabled() throws Exception {
        when(environment.getProperty("hydradontshutdown", "false")).thenReturn("true");

        testee.exitWithReturnCode(SystemControl.RESTART_RETURN_CODE);

        Thread.sleep(500);
        assertThat(exit).isNotDone();
        assertThat(dataFolder.resolve("control.id")).doesNotExist();
    }

    @Test
    void shouldExitWhenShutdownIsDisabledButForced() throws Exception {
        when(environment.getProperty("hydradontshutdown", "false")).thenReturn("true");

        testee.exitWithReturnCode(SystemControl.SHUTDOWN_RETURN_CODE, true);

        assertThat(exit.get(10, TimeUnit.SECONDS).returnCode()).isEqualTo(SystemControl.SHUTDOWN_RETURN_CODE);
    }
}
