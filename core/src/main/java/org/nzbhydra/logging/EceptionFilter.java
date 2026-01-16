

package org.nzbhydra.logging;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.filter.Filter;
import ch.qos.logback.core.spi.FilterReply;
import jakarta.annotation.PostConstruct;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Iterator;

/**
 * Hide some exceptions
 */
@Component
public class EceptionFilter extends Filter<ILoggingEvent> {

    @PostConstruct
    public void updateMarkersFilter() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            Iterator<Appender<ILoggingEvent>> appenderIterator = logger.iteratorForAppenders();
            appenderIterator.forEachRemaining(x -> x.addFilter(this));
        }
    }

    @Override
    public FilterReply decide(ILoggingEvent event) {
        //Is thrown in org.springframework.web.cors.DefaultCorsProcessor.processRequest when a POST message can't be handled for some reason
        if (event.getMessage() != null && (event.getMessage().contains("Servlet.service() for servlet [dispatcherServlet] threw exception") || event.getMessage().contains("Exception Processing ErrorPage"))) {
            return FilterReply.DENY;
        }
        return FilterReply.NEUTRAL;
    }
}
