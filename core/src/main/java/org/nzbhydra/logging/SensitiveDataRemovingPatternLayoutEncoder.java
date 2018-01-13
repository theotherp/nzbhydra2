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

    private String removeSensitiveData(String txt) {
        txt = txt.replaceAll("(?i)(apikey)([=:])\\S+", "apikey=<APIKEY>");
        txt = txt.replaceAll("(?i)password=\\S", "password=<PASSWORD>");
        txt = txt.replaceAll("(?i)username=\\S", "username=<USERNAME>");
        return txt;
    }


}
