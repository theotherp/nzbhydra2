package org.nzbhydra.historystats;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.historystats.stats.StatsRequest;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatsTest {

    @Mock
    private EntityManager entityManager;
    @InjectMocks
    private Stats testee;

    @Test
    void shouldShutDownExecutorWhenCountQueryFails() throws Exception {
        when(entityManager.createNativeQuery(anyString())).thenThrow(new IllegalStateException("database gone"));
        StatsRequest statsRequest = new StatsRequest();
        //Starts the executor's thread before the count query on the calling thread fails
        statsRequest.setAvgResponseTimes(true);
        statsRequest.setSearchSharesPerUser(true);

        assertThatThrownBy(() -> testee.getAllStats(statsRequest)).isInstanceOf(IllegalStateException.class);

        Instant deadline = Instant.now().plus(Duration.ofSeconds(5));
        while (isStatsThreadAlive() && Instant.now().isBefore(deadline)) {
            Thread.sleep(20);
        }
        assertThat(isStatsThreadAlive()).isFalse();
    }

    private static boolean isStatsThreadAlive() {
        return Thread.getAllStackTraces().keySet().stream()
            .anyMatch(thread -> thread.isAlive() && thread.getName().startsWith(Stats.STATS_THREAD_NAME_PREFIX));
    }
}
