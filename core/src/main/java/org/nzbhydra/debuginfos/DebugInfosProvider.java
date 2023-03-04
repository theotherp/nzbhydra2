package org.nzbhydra.debuginfos;

import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.javers.core.JaversBuilder;
import org.javers.core.diff.Diff;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.logging.LogAnonymizer;
import org.nzbhydra.logging.LogContentProvider;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.problemdetection.OutdatedWrapperDetector;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.update.UpdateManager;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.webaccess.Ssl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.management.ThreadDumpEndpoint;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.DecimalFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class DebugInfosProvider {

    private static final Logger logger = LoggerFactory.getLogger(DebugInfosProvider.class);
    private static final int LOG_METRICS_EVERY_SECONDS = 5;

    @Autowired
    private LogAnonymizer logAnonymizer;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private LogContentProvider logContentProvider;
    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Autowired
    private OutdatedWrapperDetector outdatedWrapperDetector;
    @Autowired
    private MetricsEndpoint metricsEndpoint;
    @Autowired
    private ThreadDumpEndpoint threadDumpEndpoint;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private OutdatedWrapperDetector wrapperDetector;

    @Autowired
    private ConfigurableEnvironment environment;
    @Autowired
    private Ssl ssl;

    @Value("spring.datasource.url")
    private String datasourceUrl;

    private final List<TimeAndThreadCpuUsages> timeAndThreadCpuUsagesList = new ArrayList<>();
    private final Map<String, Long> lastThreadCpuTimes = new HashMap<>();


    @PostConstruct
    public void logMetrics() {
        try {
            if (!configProvider.getBaseConfig().getMain().getLogging().getMarkersToLog().contains(LoggingMarkers.PERFORMANCE.getName())) {
                return;
            }
            final ScheduledExecutorService scheduledExecutorService = Executors.newSingleThreadScheduledExecutor();

            //The metrics endpoint is not available immediately after startup
            scheduledExecutorService.schedule(() -> {
                logger.debug(LoggingMarkers.PERFORMANCE, "Will log performance metrics every {} seconds", LOG_METRICS_EVERY_SECONDS);
                ScheduledExecutorService executor = Executors.newScheduledThreadPool(1);
                executor.scheduleAtFixedRate(() -> {
                    try {
                        final String cpuMetric = "process.cpu.usage";
                        String message = "Process CPU usage: " + formatSample(cpuMetric, metricsEndpoint.metric(cpuMetric, Collections.emptyList()).getMeasurements().get(0).getValue());
                        logger.debug(LoggingMarkers.PERFORMANCE, message);
                    } catch (Exception e) {
                        logger.debug(LoggingMarkers.PERFORMANCE, "Error while logging CPU usage", e);
                    }
                    try {
                        final String memoryMetric = "jvm.memory.used";
                        String message = "Process memory usage: " + formatSample(memoryMetric, metricsEndpoint.metric(memoryMetric, null).getMeasurements().get(0).getValue());
                        logger.debug(LoggingMarkers.PERFORMANCE, message);
                    } catch (Exception e) {
                        logger.debug(LoggingMarkers.PERFORMANCE, "Error while logging memory usage", e);
                    }
                    ThreadMXBean threadMxBean = ManagementFactory.getThreadMXBean();
                    final ThreadInfo[] threadInfos = threadMxBean.dumpAllThreads(true, true);

                }, 0, LOG_METRICS_EVERY_SECONDS, TimeUnit.SECONDS);

                int cpuCount = metricsEndpoint.metric("system.cpu.count", null).getMeasurements().get(0).getValue().intValue();
                ThreadMXBean threadMxBean = ManagementFactory.getThreadMXBean();
                final double[] previousUptime = {getUpTimeInMiliseconds()};
                ScheduledExecutorService executor2 = Executors.newScheduledThreadPool(1);

                executor2.scheduleAtFixedRate(new Runnable() {
                    @Override
                    public void run() {
                        final double upTime = getUpTimeInMiliseconds();
                        double elapsedTime = upTime - previousUptime[0];

                        final ThreadInfo[] threadInfos = threadMxBean.dumpAllThreads(true, true);
                        TimeAndThreadCpuUsages timeAndThreadCpuUsages = new TimeAndThreadCpuUsages(Instant.now());
                        for (ThreadInfo threadInfo : threadInfos) {
                            final String threadName = threadInfo.getThreadName();
                            final long threadCpuTime = threadMxBean.getThreadCpuTime(threadInfo.getThreadId());
                            if (!lastThreadCpuTimes.containsKey(threadName)) {
                                lastThreadCpuTimes.put(threadName, threadCpuTime);
                                continue;
                            }
                            final Long lastThreadCpuTime = lastThreadCpuTimes.get(threadName);
                            long elapsedThreadCpuTime = threadCpuTime - lastThreadCpuTime;
                            if (elapsedThreadCpuTime < 0) {
                                //Not sure why but this happens with some threads
                                continue;
                            }
                            float cpuUsage = Math.min(99F, elapsedThreadCpuTime / (float) (elapsedTime * 1000 * cpuCount));
                            if (cpuUsage < 0) {
                                cpuUsage = 0;
                            }
                            if (cpuUsage > 5F) {
                                logger.debug(LoggingMarkers.PERFORMANCE, "CPU usage of thread {}: {}", threadName, cpuUsage);
                            }
                            timeAndThreadCpuUsages.getThreadCpuUsages().add(new ThreadCpuUsage(threadName, (long) cpuUsage));

                            lastThreadCpuTimes.put(threadName, threadCpuTime);
                        }
                        timeAndThreadCpuUsagesList.add(timeAndThreadCpuUsages);
                        previousUptime[0] = upTime;
                        if (timeAndThreadCpuUsagesList.size() == 50) {
                            timeAndThreadCpuUsagesList.remove(0);
                        }
                    }

                }, 0, LOG_METRICS_EVERY_SECONDS, TimeUnit.SECONDS);
            }, 5, TimeUnit.SECONDS);

        } catch (Exception e) {
            logger.error("Error initializing performance metrics reading", e);
        }

    }

    public List<TimeAndThreadCpuUsages> getThreadCpuUsageChartData() {
        return timeAndThreadCpuUsagesList;
    }

    public static Pair<String, String> getVersionAndBuildTimestamp() {
        final Properties properties = new Properties();
        try {
            properties.load(DebugInfosProvider.class.getResourceAsStream("/config/application.properties"));
        } catch (Exception e) {
            try {
                properties.load(DebugInfosProvider.class.getResourceAsStream("/application.properties"));
            } catch (Exception ex) {
                throw new RuntimeException("Unable to load application properties", ex);
            }
        }
        return Pair.of(properties.getProperty("build.version"), properties.getProperty("build.timestamp"));
    }

    private double getUpTimeInMiliseconds() {
        return metricsEndpoint.metric("process.uptime", null).getMeasurements().get(0).getValue() * 1000;
    }

    public byte[] getDebugInfosAsZip() throws IOException {
        File tempFile = createDebugInfosZipFile();
        return Files.readAllBytes(tempFile.toPath());
    }

    public File createDebugInfosZipFile() throws IOException {
        logger.info("Creating debug infos");
        logger.info("NZBHydra2 version: {}", updateManager.getCurrentVersionString());
        final Pair<String, String> pair = DebugInfosProvider.getVersionAndBuildTimestamp();
        logger.info("NZBHydra2 build: {} ({})", pair.getLeft(), pair.getRight());
        logger.info("Java command line: {}", System.getProperty("sun.java.command"));
        logger.info("Java runtime name: {}", System.getProperty("java.runtime.name"));
        logger.info("Java runtime version: {}", System.getProperty("java.runtime.version"));
        logger.info("Java vm name: {}", System.getProperty("java.vm.name"));
        logger.info("Java vendor: {}", System.getProperty("java.vendor"));
        logger.info("Source location: {}", getClass().getProtectionDomain().getCodeSource().getLocation());
        logger.info("OS name: {}", System.getProperty("os.name"));
        logger.info("OS architecture: {}", System.getProperty("os.arch"));
        logger.info("User country: {}", System.getProperty("user.country"));
        logger.info("File encoding: {}", System.getProperty("file.encoding"));
        logger.info("Datasource URL: {}", datasourceUrl);
        logger.info("Ciphers:");

        logger.info(ssl.getSupportedCiphers());
        outdatedWrapperDetector.executeCheck();
        logNumberOfTableRows("SEARCH");
        logNumberOfTableRows("SEARCHRESULT");
        logNumberOfTableRows("INDEXERSEARCH");
        logNumberOfTableRows("INDEXERAPIACCESS");
        logNumberOfTableRows("INDEXERAPIACCESS_SHORT");
        logNumberOfTableRows("INDEXERNZBDOWNLOAD");
        logDatabaseFolderSize();
        if (isRunInDocker()) {
            logger.info("Apparently run in docker");
            logger.info("Container info: {}", updateManager.getPackageInfo());
        } else {
            logger.info("Apparently not run in docker");
        }

        String anonymizedConfig = getAnonymizedConfig();
        logConfigChanges(anonymizedConfig);

        logger.info("Metrics:");
        final Set<String> metricsNames = metricsEndpoint.listNames().getNames();
        for (String metric : metricsNames) {
            final MetricsEndpoint.MetricDescriptor response = metricsEndpoint.metric(metric, null);
            logger.info(metric + ": " + response.getMeasurements().stream()
                    .map(x -> x.getStatistic().name() + ": " + formatSample(metric, x.getValue()))
                    .collect(Collectors.joining(", ")));
        }


        String anonymizedLog = logAnonymizer.getAnonymizedLog(logContentProvider.getLog());
        File tempFile = File.createTempFile("nzbhydradebuginfos", "zip");
        try (FileOutputStream fos = new FileOutputStream(tempFile)) {
            try (ZipOutputStream zos = new ZipOutputStream(fos)) {
                writeStringToZip(zos, "nzbhydra2.log", anonymizedLog.getBytes(StandardCharsets.UTF_8));
                writeStringToZip(zos, "nzbhydra2-config.yaml", anonymizedConfig.getBytes(StandardCharsets.UTF_8));
                writeFileIfExists(zos, new File(NzbHydra.getDataFolder(), "database"), "nzbhydra.trace.db");
                File logsFolder = new File(NzbHydra.getDataFolder(), "logs");
                //Write all GC logs
                File[] files = logsFolder.listFiles((dir, name) -> name.startsWith("gclog"));
                if (files != null) {
                    for (File file : files) {
                        writeFileToZip(zos, file.getName(), file);
                    }
                }
                writeFileIfExists(zos, logsFolder, "wrapper.log");
                writeFileIfExists(zos, logsFolder, "system.err.log");
                writeFileIfExists(zos, logsFolder, "system.out.log");

                File servLogFile = new File(logsFolder, "nzbhydra2.serv.log");
                if (servLogFile.exists()) {
                    writeStringToZip(zos, "nzbhydra2.serv.log", logAnonymizer.getAnonymizedLog(IOUtils.toString(new FileReader(servLogFile))).getBytes());
                }
            }
        }
        logger.debug("Finished creating debug infos ZIP");
        return tempFile;
    }

    private void logConfigChanges(String anonymizedConfig) throws IOException {
        final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();

        final BaseConfig originalConfig = configReaderWriter.originalConfig();
        originalConfig.setCategoriesConfig(new DiffableCategoriesConfig(originalConfig.getCategoriesConfig()));

        final BaseConfig userConfig = Jackson.YAML_MAPPER.readValue(anonymizedConfig, BaseConfig.class);
        userConfig.setCategoriesConfig(new DiffableCategoriesConfig(userConfig.getCategoriesConfig()));

        try {
            final Diff configDiff = JaversBuilder.javers()
                    .build()

                    .compare(originalConfig, userConfig);
            logger.info("Difference in config:\n{}", configDiff.prettyPrint());
        } catch (Exception e) {
            logger.error("Error building config diff", e);
        }
    }

    public void logThreadDump() {
        try {
            //Fails on native image
            logger.debug(threadDumpEndpoint.textThreadDump());
        } catch (Exception e) {
            logger.error("Unable to create thread dump : {}", e.getMessage());
        }
    }

    private String formatSample(String name, Double value) {
        String suffix = "";
        if (value == 0) {
            return "0";
        }
        if (name.contains("memory")) {
            value = value / (1024 * 1024);
            suffix = "MB";
        }
        String pattern;
        if (value % 1 == 0) {
            pattern = "#,###";
        } else {
            pattern = "#,###.00";
        }
        if (name.contains("cpu")) {
            value = 100 * value;
            suffix = "%";
            pattern = "##";
        }

        return new DecimalFormat(pattern).format(value) + suffix;
    }

    private void writeFileIfExists(ZipOutputStream zos, File logsFolder, String filename) throws IOException {
        File file = new File(logsFolder, filename);
        if (file.exists()) {
            writeFileToZip(zos, filename, file);
        }
    }

    protected void logDatabaseFolderSize() {
        File databaseFolder = new File(NzbHydra.getDataFolder(), "database");
        if (!databaseFolder.exists()) {
            logger.warn("Database folder not found");
            return;
        }
        File[] databaseFiles = databaseFolder.listFiles();
        if (databaseFiles == null) {
            logger.warn("No database files found");
            return;
        }
        long databaseFolderSize = Stream.of(databaseFiles).mapToLong(File::length).sum();
        logger.info("Size of database folder: {}MB", databaseFolderSize / (1024 * 1024));
    }

    protected void logNumberOfTableRows(final String tableName) {
        try {
            logger.info("Number of rows in table " + tableName + ": " + entityManager.createNativeQuery("select count(*) from " + tableName).getSingleResult());
        } catch (Exception e) {
            logger.error("Unable to get number of rows in table " + tableName, e);
        }
    }

    public static boolean isRunInDocker() {
        return new File("/.dockerenv").exists();
    }

    @Transactional
    public String executeSqlQuery(String sql) throws IOException {
        logger.info("Executing SQL query \"{}\" and returning as CSV", sql);
        File tempFile = File.createTempFile("nzbhydra", "csv");
        String path = tempFile.getAbsolutePath().replace("\\", "/");
        entityManager.createNativeQuery(String.format("CALL CSVWRITE('%s', '%s')", path, sql.replace("'", "''"))).executeUpdate();
        return new String(Files.readAllBytes(tempFile.toPath()));
    }

    @Transactional
    public String executeSqlUpdate(String sql) {
        logger.info("Executing SQL query \"{}\"", sql);

        int affectedRows = entityManager.createNativeQuery(sql).executeUpdate();
        return String.valueOf(affectedRows);
    }

    private void writeStringToZip(ZipOutputStream zos, String name, byte[] bytes) throws IOException {
        ZipEntry zipEntry = new ZipEntry(name);
        zipEntry.setSize(bytes.length);
        zos.putNextEntry(zipEntry);
        zos.write(bytes);
        zos.closeEntry();
    }

    private void writeFileToZip(ZipOutputStream zos, String name, File file) throws IOException {
        byte[] bytes = Files.readAllBytes(file.toPath());
        writeStringToZip(zos, name, bytes);
    }


    private String getAnonymizedConfig() throws JsonProcessingException {
        return Jackson.SENSITIVE_YAML_MAPPER.writeValueAsString(configProvider.getBaseConfig());
    }

    @Data
@ReflectionMarker
    public static class TimeAndThreadCpuUsages {
        private final Instant time;
        private final List<ThreadCpuUsage> threadCpuUsages = new ArrayList<>();

        public TimeAndThreadCpuUsages(Instant time) {
            this.time = time;
        }
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    public static class ThreadCpuUsage {
        private final String threadName;
        private final long cpuUsage;
    }

    @EqualsAndHashCode(callSuper = true)
    @Data
    @ReflectionMarker
    public static class DiffableCategoriesConfig extends CategoriesConfig {
        private Map<String, Category> categoriesMap = new HashMap<>();

        public DiffableCategoriesConfig() {
        }

        public DiffableCategoriesConfig(CategoriesConfig categoriesConfig) {
            categoriesConfig.getCategories().forEach(x -> {
                categoriesMap.put(x.getName(), x);
            });
        }


    }


}
