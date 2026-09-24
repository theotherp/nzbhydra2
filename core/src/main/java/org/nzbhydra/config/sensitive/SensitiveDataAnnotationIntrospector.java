package org.nzbhydra.config.sensitive;

import tools.jackson.databind.cfg.MapperConfig;
import tools.jackson.databind.introspect.Annotated;
import tools.jackson.databind.introspect.JacksonAnnotationIntrospector;

public class SensitiveDataAnnotationIntrospector extends JacksonAnnotationIntrospector {

    private SensitiveDataHidingSerializer sensitiveDataHidingSerializer = new SensitiveDataHidingSerializer();

    @Override
    public Object findSerializer(MapperConfig<?> config, Annotated a) {
        if (a.hasAnnotation(SensitiveData.class) || a.hasAnnotation(HiddenInDebugInfos.class)) {
            return sensitiveDataHidingSerializer;
        }

        return super.findSerializer(config, a);
    }


}
