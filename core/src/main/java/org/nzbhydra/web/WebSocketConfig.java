

package org.nzbhydra.web;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.concurrent.RejectedExecutionHandler;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration(proxyBeanMethods = false)
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    private final ThreadPoolTaskExecutor taskExecutor = new ThreadPoolTaskExecutor();

    @PostConstruct
    public void init() {
        taskExecutor.setCorePoolSize(2);
        taskExecutor.setAllowCoreThreadTimeOut(true);
        taskExecutor.setWaitForTasksToCompleteOnShutdown(true);
        taskExecutor.setAwaitTerminationSeconds(5);
        taskExecutor.setThreadNamePrefix("websocket-");
        // Use a graceful rejection policy that silently discards tasks during shutdown
        // This prevents warnings when WebSocket disconnect messages can't be sent
        taskExecutor.setRejectedExecutionHandler(new GracefulShutdownRejectionHandler());
        taskExecutor.initialize();
    }

    /**
     * A rejection handler that silently discards tasks when the executor is shutting down.
     * This prevents noisy warnings during application shutdown when WebSocket sessions
     * try to send disconnect messages after the executor has been terminated.
     */
    private static class GracefulShutdownRejectionHandler implements RejectedExecutionHandler {
        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            if (!executor.isShutdown()) {
                // Only log if we're not shutting down - this would indicate a real problem
                logger.warn("Task rejected by WebSocket executor while not shutting down: {}", r);
            }
            // During shutdown, silently discard the task
        }
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/websocket")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setClientLibraryUrl("//cdn.jsdelivr.net/sockjs/1.0.3/sockjs.min.js");
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor(taskExecutor);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor(taskExecutor);
    }

    @PreDestroy
    public void onShutdown() {
        if (!taskExecutor.getThreadPoolExecutor().isShutdown()) {
            taskExecutor.shutdown();
        }
    }

}
