package org.nzbhydra.logging;

import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.nio.charset.Charset;
import java.util.regex.Pattern;

public class SensitiveDataRemovingPatternLayoutEncoder extends PatternLayoutEncoder {

    private static final Pattern QUERY_PARAMETER_PATTERN = Pattern.compile("(?i)(r|username|apikey|password)(=|:|%3D)([^&\\s]{2,})");
    //Format in requests to and responses from *arr:
    /*
    "name": "apiKey",
    "label": "API Key",
    "value": "apikey",
    */
    private static final Pattern ARR_API_KEY_PATTERN = Pattern.compile("(\"name\" ?: ?\"apiKey\",(\\s*\"label\": ?\".*\",)?\\s*\"value\" ?: \")([^\"\\s*]*)");
    private static final Pattern ARR_BASE_URL_PATTERN = Pattern.compile("(\"name\" ?: ?\"baseUrl\",(\\s*\"label\": ?\".*\",)?\\s*\"value\" ?: \")([^\"\\s*]*)");
    private static final String JSON_NAME_MARKER = "\"name\"";

    private static volatile boolean disabled = false;

    public static boolean isDisabled() {
        return disabled;
    }

    public static void setDisabled(boolean disabled) {
        SensitiveDataRemovingPatternLayoutEncoder.disabled = disabled;
    }

    private Charset charset;

    public Charset getCharset() {
        return charset;
    }

    public void setCharset(Charset charset) {
        this.charset = charset;
    }

    private byte[] convertToBytes(String s) {
        if (charset == null) {
            return s.getBytes();
        } else {
            return s.getBytes(charset);
        }
    }

    public byte[] encode(ILoggingEvent event) {
        String txt = layout.doLayout(event);
        txt = removeSensitiveData(txt);
        return convertToBytes(txt);
    }

    protected String removeSensitiveData(String txt) {
        if (disabled) {
            return txt;
        }
        txt = QUERY_PARAMETER_PATTERN.matcher(txt).replaceAll("$1$2<$1>");
        //Both *arr patterns start with the literal "name", so lines without it can't match
        if (!txt.contains(JSON_NAME_MARKER)) {
            return txt;
        }
        txt = ARR_API_KEY_PATTERN.matcher(txt).replaceAll("$1<apikey>");
        return ARR_BASE_URL_PATTERN.matcher(txt).replaceAll("$1<url>");
    }


}
