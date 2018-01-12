/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.Appender;
import ch.qos.logback.core.filter.Filter;
import ch.qos.logback.core.spi.FilterReply;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.Iterator;

@Component
public class LoggingLevelFilter extends Filter<ILoggingEvent> {

    @Autowired
    private ConfigProvider configProvider;

    String target = null;
    Level minLevel = null;

    @PostConstruct
    public void updateMarkersFilter() {
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        for (Logger logger : context.getLoggerList()) {
            Iterator<Appender<ILoggingEvent>> appenderIterator = logger.iteratorForAppenders();
            while (appenderIterator.hasNext()) {
                Appender<ILoggingEvent> appender = appenderIterator.next();
                if ("CONSOLE".equals(appender.getName())) {
                    minLevel = Level.valueOf(configProvider.getBaseConfig().getMain().getLogging().getLogfilelevel());
                    target = "CONSOLE";
                } else if ("FILE".equals(appender.getName())) {
                    minLevel = Level.valueOf(configProvider.getBaseConfig().getMain().getLogging().getConsolelevel());
                    target = "FILE";
                } else {
                    continue;
                }
                appender.addFilter(this);
            }
        }
    }
    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        if ("CONSOLE".equals(target)) {
            minLevel = Level.valueOf(configChangedEvent.getNewConfig().getMain().getLogging().getLogfilelevel());
        } else if ("FILE".equals(target)) {
            minLevel = Level.valueOf(configChangedEvent.getNewConfig().getMain().getLogging().getConsolelevel());
        }
    }


    @Override
    public FilterReply decide(ILoggingEvent event) {
        if (minLevel == null) {
            return FilterReply.NEUTRAL;
        }

        if (event.getLevel().isGreaterOrEqual(minLevel)) {
            return FilterReply.NEUTRAL;
        }
        return FilterReply.DENY;
    }
}
