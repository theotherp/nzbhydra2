/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.tasks;

import com.google.common.reflect.Invokable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.commons.lang3.time.DurationFormatUtils;
import org.nzbhydra.ShutdownEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.BeansException;
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
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ScheduledFuture;

@Component
public class HydraTaskScheduler implements BeanPostProcessor, SmartInitializingSingleton {

    private static final Logger logger = LoggerFactory.getLogger(HydraTaskScheduler.class);

    @Autowired
    private ThreadPoolTaskScheduler scheduler;
    @Autowired
    private ConfigurableEnvironment environment;

    private Map<String, TaskRuntimeInformation> runtimeInformationMap = new HashMap<>();
    private ConcurrentMap<HydraTask, TaskInformation> taskInformations = new ConcurrentHashMap<>();
    private Map<String, ScheduledFuture> taskSchedules = new HashMap<>();

    @EventListener
    public void onShutdown(ShutdownEvent event) {
        taskSchedules.values().forEach(x -> x.cancel(false));

    }

    private void scheduleTasks() {
        for (TaskRuntimeInformation runtimeInformation : runtimeInformationMap.values()) {
            scheduleTask(runtimeInformation, false);
        }
    }

    private void scheduleTask(TaskRuntimeInformation runtimeInformation, boolean runNow) {
        HydraTask task = runtimeInformation.getMethod().getAnnotation(HydraTask.class);
        if (!taskSchedules.containsKey(task.name())) { //On startup
            logger.info("Scheduling task \"{}\" to be run every {}", task.name(), DurationFormatUtils.formatDurationWords(getIntervalForTask(task), true, true));
        }
        Runnable runnable = new ScheduledMethodRunnable(runtimeInformation.getBean(), runtimeInformation.getMethod());
        if (runNow) {
            scheduler.execute(runnable);
        }
        ScheduledFuture scheduledTask = scheduler.schedule(runnable, new Trigger() {
            @Override
            public Date nextExecutionTime(TriggerContext triggerContext) {
                Calendar nextExecutionTime = new GregorianCalendar();
                Date lastCompletionTime = runNow ? new Date() : triggerContext.lastCompletionTime();
                nextExecutionTime.setTime(lastCompletionTime != null ? lastCompletionTime : new Date());
                nextExecutionTime.add(Calendar.MILLISECOND, (int) getIntervalForTask(task));
                taskInformations.put(task, new TaskInformation(task.name(), lastCompletionTime != null ? lastCompletionTime.toInstant() : null, nextExecutionTime.toInstant()));
                return nextExecutionTime.getTime();
            }
        });
        taskSchedules.put(task.name(), scheduledTask);
    }

    private long getIntervalForTask(HydraTask task) {
        String configuredInterval = environment.getProperty("hydraTasks." + task.configId());
        if (configuredInterval != null) {
            logger.debug("Using configured interval of {}ms instead of hardcoded {}ms for task \"{}\"", configuredInterval, task.interval(), task.name());
            return Long.valueOf(configuredInterval);
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

    @Override
    public void afterSingletonsInstantiated() {
        scheduleTasks();
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaskInformation {
        private String name;
        private Instant lastExecutionTime;
        private Instant nextExecutionTime;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TaskRuntimeInformation {
        private Object bean;
        private Method method;
    }

}
