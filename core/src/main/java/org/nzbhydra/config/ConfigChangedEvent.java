package org.nzbhydra.config;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ConfigChangedEvent extends ApplicationEvent {

    private BaseConfig newConfig;

    /**
     * Create a new ApplicationEvent.
     *
     * @param source the object on which the event initially occurred (never {@code null})
     */
    public ConfigChangedEvent(Object source) {
        super(source);
    }

    public ConfigChangedEvent(Object source, BaseConfig newConfig) {
        super(source);
        this.newConfig = newConfig;
    }
}
