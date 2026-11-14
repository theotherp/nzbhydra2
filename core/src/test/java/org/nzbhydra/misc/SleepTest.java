package org.nzbhydra.misc;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import static org.assertj.core.api.Assertions.assertThat;

class SleepTest {

    @AfterEach
    void tearDown() {
        //Clear the flag so it does not leak into other tests running on this thread
        Thread.interrupted();
    }

    @Test
    @Timeout(5)
    void shouldKeepInterruptFlagWhenInterruptedWhileSleeping() {
        Thread.currentThread().interrupt();

        Sleep.sleep(10_000);

        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    void shouldNotSetInterruptFlagWhenNotInterrupted() {
        Sleep.sleep(1);

        assertThat(Thread.currentThread().isInterrupted()).isFalse();
    }

}
