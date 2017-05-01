package org.nzbhydra.config.sensitive;

import com.fasterxml.jackson.core.Version;
import com.fasterxml.jackson.databind.Module;

public class SensitiveDataModule extends Module {
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
