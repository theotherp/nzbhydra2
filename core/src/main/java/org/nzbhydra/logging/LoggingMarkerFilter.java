package org.nzbhydra.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.filter.Filter;
import ch.qos.logback.core.spi.FilterReply;
import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

@Component
public class LoggingMarkerFilter extends Filter<ILoggingEvent> {

    @Autowired
    private ConfigProvider configProvider;

    private static Set<String> enabledMarkers = new HashSet<>();

    @PostConstruct
    public void updateMarkersFilter() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            Iterator<Appender<ILoggingEvent>> appenderIterator = logger.iteratorForAppenders();
            appenderIterator.forEachRemaining(x -> x.addFilter(this));
        }

        configureMarkers(configProvider.getBaseConfig());
    }

    private void configureMarkers(BaseConfig baseConfig) {
        if (baseConfig.getMain().getLogging().getMarkersToLog().contains(LoggingMarkers.SERVER.getName())) {
            ((Logger) LoggerFactory.getLogger("org.apache.tomcat")).setLevel(Level.DEBUG);
            ((Logger) LoggerFactory.getLogger("org.apache.catalina")).setLevel(Level.DEBUG);
        } else {
            ((Logger) LoggerFactory.getLogger("org.apache.tomcat")).setLevel(Level.INFO);
            ((Logger) LoggerFactory.getLogger("org.apache.catalina")).setLevel(Level.INFO);
        }
        enabledMarkers.clear();
        enabledMarkers.addAll(configProvider.getBaseConfig().getMain().getLogging().getMarkersToLog());
    }

    @EventListener
    public void handleConfigChangedEvent(ConfigChangedEvent event) {
        configureMarkers(event.getNewConfig());
    }

    public static boolean isEnabled(Marker marker) {
        return enabledMarkers.contains(marker.getName());
    }

    @Override
    public FilterReply decide(ILoggingEvent event) {
        if (event.getMarker() == null || configProvider == null) {
            return FilterReply.NEUTRAL;
        }
        if (event.getLevel() != Level.DEBUG) { //Log messages with markers only ever on level debug
            return FilterReply.DENY;
        }
        return isEnabled(event.getMarker()) ? FilterReply.ACCEPT : FilterReply.DENY;
    }
}
