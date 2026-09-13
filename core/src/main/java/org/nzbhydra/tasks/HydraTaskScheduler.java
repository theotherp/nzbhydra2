

package org.nzbhydra.tasks;

import com.google.common.reflect.Invokable;
import jakarta.annotation.PreDestroy;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.time.DurationFormatUtils;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.BeanFactoryAware;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.TriggerContext;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.support.ScheduledMethodRunnable;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ScheduledFuture;

@Component
public class HydraTaskScheduler implements BeanPostProcessor, SmartInitializingSingleton, BeanFactoryAware {

    private static final Logger logger = LoggerFactory.getLogger(HydraTaskScheduler.class);

    /**
     * Resolved in {@link #afterSingletonsInstantiated()}, not injected. This class is a {@link BeanPostProcessor}, so it
     * is created before the AOP post-processors are; any bean it needs at construction time is created then too and is
     * therefore "not eligible for getting processed by all BeanPostProcessors" (Spring logs a warning per bean). Looked
     * up by name because the WebSocket configuration registers three more schedulers of the same type.
     */
    private ThreadPoolTaskScheduler scheduler;
    private BeanFactory beanFactory;
    @Autowired
    private ConfigurableEnvironment environment;

    private final Map<String, TaskRuntimeInformation> runtimeInformationMap = new HashMap<>();
    private final ConcurrentMap<HydraTask, TaskInformation> taskInformations = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture> taskSchedules = new HashMap<>();
    private boolean shutdownRequested;

    @EventListener
    public void handleShutdown(ShutdownEvent shutdownEvent) {
        onShutdown();
    }

    @PreDestroy
    public void onShutdown() {
        taskSchedules.values().forEach(x -> x.cancel(false));
        shutdownRequested = true;
        if (scheduler != null) {
            scheduler.shutdown();
        }
    }

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        this.beanFactory = beanFactory;
    }

    @Override
    public void afterSingletonsInstantiated() {
        scheduler = beanFactory.getBean(HydraTaskConfiguration.SCHEDULER_BEAN_NAME, ThreadPoolTaskScheduler.class);
        scheduleTasks();
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(5);
    }


    private void scheduleTasks() {
        for (TaskRuntimeInformation runtimeInformation : runtimeInformationMap.values()) {
            scheduleTask(runtimeInformation, true);
        }
    }

    private void scheduleTask(TaskRuntimeInformation runtimeInformation, boolean runNow) {
        HydraTask task = runtimeInformation.getMethod().getAnnotation(HydraTask.class);
        if (!taskSchedules.containsKey(task.name())) { //On startup
            logger.info("Scheduling task \"{}\" to be run every {}", task.name(), DurationFormatUtils.formatDurationWords(getIntervalForTask(task), true, true));
        }
        Runnable runnable = () -> {
            if (shutdownRequested) {
                return;
            }
            Thread.currentThread().setName("HT-" + task.name());
            new ScheduledMethodRunnable(runtimeInformation.getBean(), runtimeInformation.getMethod()).run();
        };
        if (runNow && !shutdownRequested) {
            scheduler.execute(runnable);
            scheduler.setRemoveOnCancelPolicy(true);
        }
        ScheduledFuture scheduledTask = scheduler.schedule(runnable, new Trigger() {
            @Override
            public Instant nextExecution(TriggerContext triggerContext) {
                Instant lastCompletionTime = runNow ? Instant.now() : triggerContext.lastCompletion();
                Instant nextExecutionTime = lastCompletionTime != null ? lastCompletionTime : Instant.now();
                nextExecutionTime = nextExecutionTime.plusMillis((int) getIntervalForTask(task));
                taskInformations.put(task, new TaskInformation(task.name(), lastCompletionTime, nextExecutionTime));
                return nextExecutionTime;
            }
        });
        taskSchedules.put(task.name(), scheduledTask);
    }

    private long getIntervalForTask(HydraTask task) {
        String configuredInterval = environment.getProperty("hydraTasks." + task.configId());
        if (configuredInterval != null) {
            logger.debug("Using configured interval of {}ms instead of hardcoded {}ms for task \"{}\"", configuredInterval, task.interval(), task.name());
            return Long.parseLong(configuredInterval);
        }
        return task.interval();
    }


    public List<TaskInformation> getTasks() {
        List<TaskInformation> information = new ArrayList<>(taskInformations.values());
        information.sort(Comparator.comparingLong(x -> x.nextExecutionTime.getEpochSecond()));
        return information;
    }

    public void runNow(String taskName) {
        logger.info("Running task \"{}\" now", taskName);
        ScheduledFuture scheduledFuture = taskSchedules.get(taskName);
        scheduledFuture.cancel(false);
        scheduleTask(runtimeInformationMap.get(taskName), true);
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        Class<?> targetClass = AopUtils.getTargetClass(bean);
        for (Method method : targetClass.getMethods()) {
            HydraTask hydraTask = Invokable.from(method).getAnnotation(HydraTask.class);
            if (hydraTask != null) {
                runtimeInformationMap.put(hydraTask.name(), new TaskRuntimeInformation(bean, method));
            }
        }
        return bean;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaskInformation {
        private String name;
        private Instant lastExecutionTime;
        private Instant nextExecutionTime;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaskRuntimeInformation {
        private Object bean;
        private Method method;
    }

}
