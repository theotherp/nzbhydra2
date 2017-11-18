package org.nzbhydra.config;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ConfigChangedEvent extends ApplicationEvent {

    private BaseConfig oldConfig;
    private BaseConfig newConfig;

    /**
     * Create a new ApplicationEvent.
     *
     * @param source the object on which the event initially occurred (never {@code null})
     */
    public ConfigChangedEvent(Object source) {
        super(source);
    }

    public ConfigChangedEvent(Object source, BaseConfig oldConfig, BaseConfig newConfig) {
        super(source);
        this.oldConfig = oldConfig;
        this.newConfig = newConfig;
    }
}
