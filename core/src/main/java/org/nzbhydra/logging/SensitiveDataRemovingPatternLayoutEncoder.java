package org.nzbhydra.logging;

import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.CoreConstants;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.nio.charset.Charset;

public class SensitiveDataRemovingPatternLayoutEncoder extends PatternLayoutEncoder {

    private Charset charset;

    private boolean immediateFlush = true;

    void writeHeader() throws IOException {
        if (layout != null && (outputStream != null)) {
            StringBuilder sb = new StringBuilder();
            appendIfNotNull(sb, layout.getFileHeader());
            appendIfNotNull(sb, layout.getPresentationHeader());
            if (sb.length() > 0) {
                sb.append(CoreConstants.LINE_SEPARATOR);
                // If at least one of file header or presentation header were not
                // null, then append a line separator.
                // This should be useful in most cases and should not hurt.
                outputStream.write(convertToBytes(sb.toString()));
                outputStream.flush();
            }
        }
    }

    public void close() throws IOException {
        writeFooter();
    }

    void writeFooter() throws IOException {
        if (layout != null && outputStream != null) {
            StringBuilder sb = new StringBuilder();
            appendIfNotNull(sb, layout.getPresentationFooter());
            appendIfNotNull(sb, layout.getFileFooter());
            if (sb.length() > 0) {
                outputStream.write(convertToBytes(sb.toString()));
                outputStream.flush();
            }
        }
    }

    private byte[] convertToBytes(String s) {
        if (charset == null) {
            return s.getBytes();
        } else {
            try {
                return s.getBytes(charset.name());
            } catch (UnsupportedEncodingException e) {
                throw new IllegalStateException("An existing charset cannot possibly be unsupported.");
            }
        }
    }

    public void doEncode(ILoggingEvent event) throws IOException {
        String txt = layout.doLayout(event);
        txt = removeSensitiveData(txt);
        outputStream.write(convertToBytes(txt));
        if (immediateFlush) {
            outputStream.flush();
        }
    }

    private String removeSensitiveData(String txt) {
        txt = txt.replaceAll("(?i)(apikey)([=:])[\\w]+", "apikey=<APIKEY>");
        txt = txt.replaceAll("(?i)password=[^0]+\\w", "password=<PASSWORD>");
        txt = txt.replaceAll("(?i)username=\\w+", "username=<USERNAME>");
        return txt;
    }

    private void appendIfNotNull(StringBuilder sb, String s) {
        if (s != null) {
            sb.append(s);
        }
    }

}
