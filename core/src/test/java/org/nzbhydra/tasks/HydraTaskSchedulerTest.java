package org.nzbhydra.tasks;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.TriggerContext;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HydraTaskSchedulerTest {

    private static final long INTERVAL = 60_000L;

    @Mock
    private ConfigurableEnvironment environment;
    @InjectMocks
    private HydraTaskScheduler testee;

    private HydraTask task;

    @BeforeEach
    void setUp() throws Exception {
        task = HydraTaskSchedulerTest.class.getDeclaredMethod("dummyTask").getAnnotation(HydraTask.class);
    }

    @HydraTask(configId = "dummyTask", name = "Dummy task", interval = INTERVAL)
    void dummyTask() {
    }

    @Test
    void shouldScheduleConfiguredIntervalLongerThanIntegerRange() {
        long longInterval = Duration.ofDays(30).toMillis();
        assertThat(longInterval).isGreaterThan(Integer.MAX_VALUE);
        when(environment.getProperty("hydraTasks.dummyTask")).thenReturn(String.valueOf(longInterval));
        Trigger trigger = testee.createTrigger(task, false);
        Instant lastCompletion = Instant.parse("2026-01-01T00:00:00Z");
        TriggerContext triggerContext = mock(TriggerContext.class);
        when(triggerContext.lastCompletion()).thenReturn(lastCompletion);

        Instant nextExecution = trigger.nextExecution(triggerContext);

        assertThat(nextExecution).isEqualTo(lastCompletion.plusMillis(longInterval));
    }

    @Test
    void shouldUseNowOnlyForFirstEvaluationWhenRunNow() {
        Trigger trigger = testee.createTrigger(task, true);
        Instant lastCompletion = Instant.parse("2026-01-01T00:00:00Z");
        TriggerContext triggerContext = mock(TriggerContext.class);

        Instant before = Instant.now();
        Instant firstExecution = trigger.nextExecution(triggerContext);
        Instant after = Instant.now();

        assertThat(firstExecution).isBetween(before.plusMillis(INTERVAL), after.plusMillis(INTERVAL));

        when(triggerContext.lastCompletion()).thenReturn(lastCompletion);
        Instant secondExecution = trigger.nextExecution(triggerContext);

        assertThat(secondExecution).isEqualTo(lastCompletion.plusMillis(INTERVAL));
        assertThat(testee.getTasks()).hasSize(1);
        assertThat(testee.getTasks().get(0).getLastExecutionTime()).isEqualTo(lastCompletion);
        assertThat(testee.getTasks().get(0).getNextExecutionTime()).isEqualTo(lastCompletion.plusMillis(INTERVAL));
    }

    @Test
    void shouldUseNowWhenNoCompletionYetAndNotRunNow() {
        Trigger trigger = testee.createTrigger(task, false);
        TriggerContext triggerContext = mock(TriggerContext.class);

        Instant before = Instant.now();
        Instant nextExecution = trigger.nextExecution(triggerContext);
        Instant after = Instant.now();

        assertThat(nextExecution).isBetween(before.plusMillis(INTERVAL), after.plusMillis(INTERVAL));
        assertThat(testee.getTasks().get(0).getLastExecutionTime()).isNull();
    }
}
