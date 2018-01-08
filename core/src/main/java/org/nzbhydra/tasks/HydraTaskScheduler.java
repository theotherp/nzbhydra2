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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.Trigger;
import org.springframework.scheduling.TriggerContext;
import org.springframework.scheduling.annotation.SchedulingConfigurer;
import org.springframework.scheduling.config.ScheduledTask;
import org.springframework.scheduling.config.ScheduledTaskRegistrar;
import org.springframework.scheduling.config.TriggerTask;
import org.springframework.scheduling.support.ScheduledMethodRunnable;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@Configuration
public class HydraTaskScheduler implements SchedulingConfigurer, BeanPostProcessor {

    private static final Logger logger = LoggerFactory.getLogger(HydraTaskScheduler.class);

    @Bean
    public Executor taskExecutor() {
        return Executors.newScheduledThreadPool(100);
    }

    private Map<Method, Object> tasks = new HashMap<>();
    private ConcurrentMap<HydraTask, TaskInformation> taskInformations = new ConcurrentHashMap<>();
    private Map<HydraTask, ScheduledTask> taskSchedules = new HashMap<>(); //Later for cancelling / starting tasks

    @Override
    public void configureTasks(ScheduledTaskRegistrar taskRegistrar) {
        //TODO Check if works with transactional
        for (Entry<Method, Object> entry : tasks.entrySet()) {
            HydraTask task = entry.getKey().getAnnotation(HydraTask.class);
            logger.info("Scheduling task {} to be run every {}", task.value(), DurationFormatUtils.formatDurationWords(task.interval(), true, true));
            Runnable runnable = new ScheduledMethodRunnable(entry.getValue(), entry.getKey());
            ScheduledTask scheduledTask = taskRegistrar.scheduleTriggerTask(new TriggerTask(runnable, new Trigger() {
                @Override
                public Date nextExecutionTime(TriggerContext triggerContext) {
                    Calendar nextExecutionTime = new GregorianCalendar();
                    Date lastActualExecutionTime = triggerContext.lastActualExecutionTime();
                    nextExecutionTime.setTime(lastActualExecutionTime != null ? lastActualExecutionTime : new Date());
                    nextExecutionTime.add(Calendar.MILLISECOND, (int) task.interval());
                    taskInformations.put(task, new TaskInformation(task.value(), lastActualExecutionTime != null ? lastActualExecutionTime.toInstant(): null, nextExecutionTime.toInstant()));
                    return nextExecutionTime.getTime();
                }
            }));
            taskSchedules.put(task, scheduledTask);
        }
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
                tasks.put(method, bean);
            }
        }
        return bean;
    }

    public List<TaskInformation> getTasks() {
        List<TaskInformation> information = new ArrayList<>(taskInformations.values());
        information.sort(Comparator.comparing(x -> x.name));
        return information;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public class TaskInformation {
        private String name;
        private Instant lastExecutionTime;
        private Instant nextExecutionTime;
    }

}
