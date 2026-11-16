package org.nzbhydra.indexers.torbox;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Runs the parallel usenet and torrent calls of all Torbox indexer instances. The indexers are prototype beans that are
 * replaced on every config save and never destroyed by Spring, so they must not own threads themselves.
 */
@Component
public class TorboxSearchExecutor {

    static final String THREAD_NAME_PREFIX = "torbox-search-";

    // Idle threads end after a minute, so the pool only holds threads while searches are running
    private final ExecutorService executorService = Executors.newCachedThreadPool(new ThreadFactoryBuilder()
        .setNameFormat(THREAD_NAME_PREFIX + "%d")
        .setDaemon(true)
        .build());

    public <T> Future<T> submit(Callable<T> callable) {
        return executorService.submit(callable);
    }

    @PreDestroy
    public void shutdown() {
        executorService.shutdownNow();
    }
}
