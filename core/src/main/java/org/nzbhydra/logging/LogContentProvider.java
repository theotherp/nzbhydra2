package org.nzbhydra.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.FileAppender;
import ch.qos.logback.core.rolling.RollingFileAppender;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.Jackson;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class LogContentProvider {


    public long getLogFileSize() throws IOException {
        File logfile = getCurrentLogfile(false);
        if (logfile == null) {
            throw new IOException("Unable to determine log file");
        }
        if (!logfile.exists()) {
            throw new IOException("Determined log file does not exist");
        }
        return logfile.length();
    }

    public String getLog() throws IOException {
        File logfile = getCurrentLogfile(false);
        if (logfile == null) {
            throw new IOException("Unable to determine log file");
        }
        if (!logfile.exists()) {
            throw new IOException("Determined log file does not exist");
        }
        final long logFileSizeMb = logfile.length() / (1024 * 1024);
        if (logFileSizeMb > 256) {
            throw new IOException("Log file " + logfile + " is " + logFileSizeMb + "MB and therefore too large to handle");
        }
        return new String(Files.readAllBytes(logfile.toPath()));
    }

    public List<String> getLogFileNames() {
        File[] logFiles = new File(NzbHydra.getDataFolder(), "logs").listFiles();
        if (logFiles == null) {
            return Collections.emptyList();
        }
        return Stream.of(logFiles).sorted(Comparator.comparingLong(File::lastModified).reversed()).map(File::getName).filter(name -> name.toLowerCase().endsWith("log")).collect(Collectors.toList());
    }

    public JsonLogResponse getLogsAsJsonLines(int offset, int limit) throws IOException {
        File logfile = getCurrentLogfile(true);
        if (logfile == null) {
            throw new IOException("Unable to determine log file");
        }
        if (!logfile.exists()) {
            throw new IOException("Determined log file does not exist");
        }
        List<HashMap<String, Object>> objects = new ArrayList<>();
        int count = 0;
        String line;
        try (ReversedLinesFileReader reversedLinesFileReader = new ReversedLinesFileReader(logfile, Charset.defaultCharset())) {
            line = reversedLinesFileReader.readLine();
            while (offset > 0 && count++ < offset && line != null) {
                line = reversedLinesFileReader.readLine();
            }
            if (count > 0 && line == null) {
                return new JsonLogResponse(Collections.emptyList(), false, offset, 0);
            }
            count = 1;
            while (line != null && count++ <= limit) {
                TypeReference<HashMap<String, Object>> typeRef
                    = new TypeReference<>() {
                };

                HashMap<String, Object> o = Jackson.JSON_MAPPER.readValue(line, typeRef);
                objects.add(o);
                line = reversedLinesFileReader.readLine();
            }
        }

        return new JsonLogResponse(objects, line != null, offset, objects.size());
    }

    /**
     * Every {@link RollingFileAppender} the logger context has, deduplicated:
     * one appender is normally attached to several loggers, and rolling or
     * truncating the same file twice is at best wasted work.
     */
    private List<RollingFileAppender<?>> getRollingFileAppenders() {
        final List<RollingFileAppender<?>> appenders = new ArrayList<>();
        final LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            for (Iterator<Appender<ILoggingEvent>> index = logger.iteratorForAppenders(); index.hasNext(); ) {
                final Appender<ILoggingEvent> appender = index.next();
                if (appender instanceof RollingFileAppender<?> rolling && appenders.stream().noneMatch(x -> x == rolling)) {
                    appenders.add(rolling);
                }
            }
        }
        return appenders;
    }

    /**
     * Archives every active log file and starts it again empty: the contents
     * are copied to a timestamped neighbour and the active file is truncated.
     * Nothing is lost, so this is the one to reach for when the history still
     * matters.
     *
     * <p>Not {@link RollingFileAppender#rollover()}, which cannot be called
     * outside a rollover its policy actually triggered:
     * {@code TimeBasedRollingPolicy} asks its triggering policy for the elapsed
     * period's file name, gets {@code null} because no period has elapsed, and
     * throws {@code NullPointerException} out of {@code FileFilterUtil}.
     *
     * <p>Because the rollover is done here rather than by the policy, these
     * archives are outside logback's {@code maxHistory} bookkeeping and it will
     * not prune them.
     *
     * @return the names of the archives written
     */
    public List<String> rotate() throws IOException {
        final String stamp = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss").format(LocalDateTime.now());
        final List<String> rotated = new ArrayList<>();
        for (RollingFileAppender<?> appender : getRollingFileAppenders()) {
            final File file = new File(appender.getFile());
            if (!file.exists()) {
                continue;
            }
            final File archive = new File(file.getParentFile(), archiveName(file.getName(), stamp));
            Files.copy(file.toPath(), archive.toPath(), StandardCopyOption.REPLACE_EXISTING);
            truncate(file);
            rotated.add(archive.getName());
        }
        return rotated;
    }

    /**
     * Truncates every active log file, discarding its contents. Archived files
     * from earlier rollovers are left alone.
     *
     * @return the paths that were cleared
     */
    public List<String> clear() throws IOException {
        final List<String> cleared = new ArrayList<>();
        for (RollingFileAppender<?> appender : getRollingFileAppenders()) {
            final File file = new File(appender.getFile());
            truncate(file);
            cleared.add(file.getAbsolutePath());
        }
        return cleared;
    }

    /**
     * `nzbhydra2.log` becomes `nzbhydra2.<stamp>.log`, mirroring the shape of
     * the rolling policies' own `fileNamePattern`s so the text log's archives
     * keep the `.log` suffix {@link #getLogFileNames()} filters on.
     */
    private static String archiveName(String name, String stamp) {
        final int extension = name.lastIndexOf('.');
        return extension == -1
            ? name + "." + stamp
            : name.substring(0, extension) + "." + stamp + name.substring(extension);
    }

    /**
     * Empties a log file while its appender keeps writing to it.
     *
     * <p>The appender is deliberately left running. Logback opens its file in
     * append mode, so every later write lands at the current end of the file and
     * a truncation underneath it is picked up correctly. Stopping and restarting
     * the appender instead leaves its triggering policy stopped, and logback
     * then refuses to bring it back -- "TriggeringPolicy has not started.
     * RollingFileAppender will not start", after which the instance stops
     * logging at all, while the call that did it still reports success.
     */
    private void truncate(File file) throws IOException {
        if (file.exists()) {
            Files.write(file.toPath(), new byte[0]);
        }
    }

    public File getCurrentLogfile(boolean getJsonFile) {
        File clientLogFile = new File(new File(NzbHydra.getDataFolder(), "logs"), (getJsonFile ? "nzbhydra2-log.json" : "nzbhydra2.log"));
        if (clientLogFile.exists()) {
            return clientLogFile;
        }
        FileAppender<?> fileAppender = null;
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            for (Iterator<Appender<ILoggingEvent>> index = logger.iteratorForAppenders();
                 index.hasNext(); ) {
                Object enumElement = index.next();
                if (enumElement instanceof FileAppender<?> temp) {
                    if (getJsonFile) {
                        if (!temp.getEncoder().getClass().getName().equals(SensitiveDataRemovingPatternLayoutEncoder.class.getName())) {
                            fileAppender = temp;
                            break;
                        }
                    } else {
                        if (temp.getEncoder().getClass().getName().equals(SensitiveDataRemovingPatternLayoutEncoder.class.getName())) {
                            fileAppender = temp;
                            break;
                        }
                    }

                }
            }
        }

        if (fileAppender != null) {
            clientLogFile = new File(fileAppender.getFile());
        } else {
            clientLogFile = null;
        }
        return clientLogFile;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class JsonLogResponse {
        private List<HashMap<String, Object>> lines;
        private boolean hasMore;
        private int offset;
        private int lineCount;
    }

}
