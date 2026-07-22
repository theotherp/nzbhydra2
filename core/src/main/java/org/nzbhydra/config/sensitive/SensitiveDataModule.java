package org.nzbhydra.config.sensitive;

import tools.jackson.core.Version;
import tools.jackson.databind.JacksonModule;

public class SensitiveDataModule extends JacksonModule {
    @Override
    public String getModuleName() {
        return "SensitiveDataHider";
    }

    @Override
    public Version version() {
        return new Version(1, 0, 0, "", null, null);
    }

    @Override
    public void setupModule(SetupContext context) {
        context.appendAnnotationIntrospector(new SensitiveDataAnnotationIntrospector());
    }
}
