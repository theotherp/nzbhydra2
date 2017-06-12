package org.nzbhydra.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.FileAppender;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

@Component
public class LogContentProvider {

    public String getLog() throws IOException {
        File logfile = getLogfile(false);
        if (logfile == null) {
            throw new IOException("Unable to determine log file");
        }
        if (!logfile.exists()) {
            throw new IOException("Determined log file does not exist");
        }
        return new String(Files.readAllBytes(logfile.toPath()));
    }

    public List<HashMap<String, Object>> getLogsAsJsonLines(int offset, int limit) throws IOException {
        File logfile = getLogfile(true);
        if (logfile == null) {
            throw new IOException("Unable to determine log file");
        }
        if (!logfile.exists()) {
            throw new IOException("Determined log file does not exist");
        }
        List<HashMap<String, Object>> objects = new ArrayList<>();
        int count = 0;
        String line = null;
        ReversedLinesFileReader reversedLinesFileReader = new ReversedLinesFileReader(logfile, Charset.defaultCharset());
        while (offset > 0 && count++ < offset) {
            line = reversedLinesFileReader.readLine();
        }
        if (count > 0 && line == null) {
            return Collections.emptyList();
        }
        count = 0;
        line = "";
        ObjectMapper objectMapper = new ObjectMapper();
        while (line != null && count++ < limit) {
            line = reversedLinesFileReader.readLine();
            TypeReference<HashMap<String, Object>> typeRef
                    = new TypeReference<HashMap<String, Object>>() {
            };

            HashMap<String, Object> o = objectMapper.readValue(line, typeRef);
            objects.add(o);
        }
        return objects;
    }

    private File getLogfile(boolean getJsonFile) {
        File clientLogFile;
        FileAppender<?> fileAppender = null;
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            for (Iterator<Appender<ILoggingEvent>> index = logger.iteratorForAppenders();
                 index.hasNext(); ) {
                Object enumElement = index.next();
                if (enumElement instanceof FileAppender) {
                    FileAppender<?> temp = (FileAppender<?>) enumElement;
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

}
