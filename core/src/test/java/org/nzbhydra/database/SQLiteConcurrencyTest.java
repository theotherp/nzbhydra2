/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.database;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
@ActiveProfiles("test")
public class SQLiteConcurrencyTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private ConfigProvider configProvider;

    private static final int NUM_THREADS = 10;
    private static final int OPERATIONS_PER_THREAD = 100;
    private static final int TEST_DURATION_SECONDS = 30;

    @BeforeEach
    public void setUp() {
        // Ensure we have a clean test database
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("DELETE FROM SEARCH_RESULT");
            conn.createStatement().execute("DELETE FROM SEARCH");
            conn.createStatement().execute("DELETE FROM INDEXERNZBDOWNLOAD");
        } catch (SQLException e) {
            fail("Failed to clean test database: " + e.getMessage());
        }
    }

    @Test
    public void testConcurrentReadsAndWrites() throws InterruptedException {
        System.out.println("Starting concurrent read/write test with " + NUM_THREADS + " threads for " + TEST_DURATION_SECONDS + " seconds");

        ExecutorService executor = Executors.newFixedThreadPool(NUM_THREADS);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(NUM_THREADS);

        AtomicInteger successfulOperations = new AtomicInteger(0);
        AtomicInteger failedOperations = new AtomicInteger(0);
        AtomicLong totalReadTime = new AtomicLong(0);
        AtomicLong totalWriteTime = new AtomicLong(0);

        List<Future<?>> futures = new ArrayList<>();

        // Start multiple threads performing different operations
        for (int i = 0; i < NUM_THREADS; i++) {
            final int threadId = i;
            Future<?> future = executor.submit(() -> {
                try {
                    startLatch.await(); // Wait for all threads to start simultaneously

                    for (int j = 0; j < OPERATIONS_PER_THREAD; j++) {
                        try {
                            // Simulate search result writes (like your app does)
                            if (threadId % 3 == 0) {
                                long startTime = System.currentTimeMillis();
                                performWriteOperation(threadId, j);
                                totalWriteTime.addAndGet(System.currentTimeMillis() - startTime);
                            }
                            // Simulate search reads
                            else if (threadId % 3 == 1) {
                                long startTime = System.currentTimeMillis();
                                performReadOperation(threadId, j);
                                totalReadTime.addAndGet(System.currentTimeMillis() - startTime);
                            }
                            // Simulate mixed read/write operations
                            else {
                                long startTime = System.currentTimeMillis();
                                performMixedOperation(threadId, j);
                                totalWriteTime.addAndGet(System.currentTimeMillis() - startTime);
                            }

                            successfulOperations.incrementAndGet();

                            // Small delay to simulate real-world usage
                            Thread.sleep(10);

                        } catch (Exception e) {
                            failedOperations.incrementAndGet();
                            System.err.println("Thread " + threadId + " operation " + j + " failed: " + e.getMessage());
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    endLatch.countDown();
                }
            });
            futures.add(future);
        }

        // Start all threads simultaneously
        startLatch.countDown();

        // Wait for test to complete or timeout
        boolean completed = endLatch.await(TEST_DURATION_SECONDS, TimeUnit.SECONDS);

        // Shutdown executor
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);

        // Print results
        System.out.println("Test completed: " + (completed ? "normally" : "timeout"));
        System.out.println("Successful operations: " + successfulOperations.get());
        System.out.println("Failed operations: " + failedOperations.get());
        System.out.println("Average read time: " + (totalReadTime.get() / Math.max(1, successfulOperations.get() / 3)) + "ms");
        System.out.println("Average write time: " + (totalWriteTime.get() / Math.max(1, successfulOperations.get() / 3)) + "ms");

        // Assertions
        assertTrue(successfulOperations.get() > 0, "Should have successful operations");
        assertTrue(failedOperations.get() < successfulOperations.get() * 0.1, "Failure rate should be less than 10%");

        // Verify database integrity
        verifyDatabaseIntegrity();
    }

    @Transactional
    private void performWriteOperation(int threadId, int operationId) {
        // Simulate saving search results (like your app does)
        SearchResultEntity result = new SearchResultEntity();
        result.setTitle("Test Result " + threadId + "-" + operationId);
        result.setLink("http://test" + threadId + "-" + operationId + ".com");
        result.setIndexerGuid("guid-" + threadId + "-" + operationId);
        // Note: We need an IndexerEntity, but for testing we'll skip this field
        // result.setIndexer(indexerEntity); // This would need a real IndexerEntity
        result.setPubDate(Instant.now());
        result.setFirstFound(Instant.now());
        result.setDetails("Test details for " + threadId + "-" + operationId);
        // Note: DownloadType is an enum, we'll skip it for simplicity
        // result.setDownloadType(DownloadType.NZB);

        searchResultRepository.save(result);
    }

    @Transactional(readOnly = true)
    private void performReadOperation(int threadId, int operationId) {
        // Simulate reading search results
        List<SearchResultEntity> results = searchResultRepository.findAll();
        assertNotNull(results, "Should be able to read results");

        // Simulate complex query like your stats
        if (results.size() > 0) {
            SearchResultEntity first = results.get(0);
            assertNotNull(first.getTitle(), "Should have title");
        }
    }

    @Transactional
    private void performMixedOperation(int threadId, int operationId) {
        // Simulate mixed read/write operations like your app does
        // First read
        List<SearchResultEntity> existingResults = searchResultRepository.findAll();

        // Then write
        SearchResultEntity result = new SearchResultEntity();
        result.setTitle("Mixed Result " + threadId + "-" + operationId);
        result.setLink("http://mixed" + threadId + "-" + operationId + ".com");
        result.setIndexerGuid("mixed-guid-" + threadId + "-" + operationId);
        // Note: We need an IndexerEntity, but for testing we'll skip this field
        // result.setIndexer(indexerEntity); // This would need a real IndexerEntity
        result.setPubDate(Instant.now());
        result.setFirstFound(Instant.now());
        result.setDetails("Mixed details for " + threadId + "-" + operationId);
        // Note: DownloadType is an enum, we'll skip it for simplicity
        // result.setDownloadType(DownloadType.NZB);

        searchResultRepository.save(result);

        // Read again to verify
        List<SearchResultEntity> updatedResults = searchResultRepository.findAll();
        assertTrue(updatedResults.size() >= existingResults.size(), "Should have more results after write");
    }

    private void verifyDatabaseIntegrity() {
        try (Connection conn = dataSource.getConnection()) {
            // Check if database is accessible
            try (PreparedStatement stmt = conn.prepareStatement("SELECT COUNT(*) FROM SEARCH_RESULT")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next(), "Should be able to query database");
                    int count = rs.getInt(1);
                    System.out.println("Final database record count: " + count);
                    assertTrue(count > 0, "Should have records in database");
                }
            }

            // Check for any corruption
            try (PreparedStatement stmt = conn.prepareStatement("PRAGMA integrity_check")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next(), "Should be able to run integrity check");
                    String result = rs.getString(1);
                    assertEquals("ok", result, "Database integrity check should pass");
                }
            }

        } catch (SQLException e) {
            fail("Database integrity check failed: " + e.getMessage());
        }
    }

    @Test
    public void testConnectionPoolBehavior() throws InterruptedException {
        System.out.println("Testing connection pool behavior under load");

        ExecutorService executor = Executors.newFixedThreadPool(5);
        CountDownLatch latch = new CountDownLatch(5);
        AtomicInteger connectionErrors = new AtomicInteger(0);

        for (int i = 0; i < 5; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < 20; j++) {
                        try (Connection conn = dataSource.getConnection()) {
                            // Simulate database operations
                            conn.createStatement().execute("SELECT 1");
                            Thread.sleep(50);
                        } catch (SQLException e) {
                            connectionErrors.incrementAndGet();
                            System.err.println("Connection error: " + e.getMessage());
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    latch.countDown();
                }
            });
        }

        boolean completed = latch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        System.out.println("Connection pool test completed. Errors: " + connectionErrors.get());
        assertTrue(connectionErrors.get() < 5, "Should have minimal connection errors");
    }
} 