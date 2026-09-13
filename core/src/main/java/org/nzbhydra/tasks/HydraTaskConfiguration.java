

package org.nzbhydra.tasks;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration(proxyBeanMethods = false)
public class HydraTaskConfiguration {

    /**
     * Looked up by name in {@link HydraTaskScheduler}: the WebSocket configuration registers three more
     * {@link ThreadPoolTaskScheduler} beans, so a lookup by type is ambiguous.
     */
    public static final String SCHEDULER_BEAN_NAME = "taskExecutor";

    @Bean(SCHEDULER_BEAN_NAME)
    public ThreadPoolTaskScheduler taskExecutor() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("HydraTask");
        scheduler.setThreadGroupName("HydraTask");
        return scheduler;
    }
}
