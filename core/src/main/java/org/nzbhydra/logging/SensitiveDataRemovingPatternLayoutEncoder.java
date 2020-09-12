package org.nzbhydra.logging;

import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.nio.charset.Charset;

public class SensitiveDataRemovingPatternLayoutEncoder extends PatternLayoutEncoder {

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
        return txt.replaceAll("(?i)(username|apikey|password)(=|:|%3D)([^&\\s]{2,})", "$1$2<$1>")
                //Format in requests to and responses from *arr:
                /*
                "name": "apiKey",
                "label": "API Key",
                "value": "apikey",
                */
                .replaceAll("(\"name\" ?: ?\"apiKey\",(\\s*\"label\": ?\".*\",)?\\s*\"value\" ?: \")([^\"\\s*]*)", "$1<apikey>")
                .replaceAll("(\"name\" ?: ?\"baseUrl\",(\\s*\"label\": ?\".*\",)?\\s*\"value\" ?: \")([^\"\\s*]*)", "$1<url>")
                ;
    }


}
