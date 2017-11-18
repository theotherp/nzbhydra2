package org.nzbhydra.logging;

import ch.qos.logback.classic.pattern.ClassicConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;
import com.google.common.base.Joiner;

import java.util.ArrayList;
import java.util.List;

public class MdcLogConverter extends ClassicConverter {
    @Override
    public String convert(ILoggingEvent event) {
        List<String> elements = new ArrayList<>();
        if (event.getMDCPropertyMap().containsKey("SEARCH")) {
            elements.add("Search: " + event.getMDCPropertyMap().get("SEARCH"));
        }
        if (event.getMDCPropertyMap().containsKey("IPADDRESS")) {
            elements.add("IP: " + event.getMDCPropertyMap().get("IPADDRESS"));
        }
        if (event.getMDCPropertyMap().containsKey("USERNAME")) {
            elements.add("User: " + event.getMDCPropertyMap().get("USERNAME"));
        }
        return elements.isEmpty() ? "" : "[" + Joiner.on(", ").join(elements) + "] ";
    }
}
