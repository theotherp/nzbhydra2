package org.nzbhydra.config.sensitive;

import com.fasterxml.jackson.databind.introspect.Annotated;
import com.fasterxml.jackson.databind.introspect.JacksonAnnotationIntrospector;

public class SensitiveDataAnnotationIntrospector extends JacksonAnnotationIntrospector {

    private SensitiveDataHidingSerializer sensitiveDataHidingSerializer = new SensitiveDataHidingSerializer();

    @Override
    public Object findSerializer(Annotated a) {
        SensitiveData annotation = a.getAnnotation(SensitiveData.class);
        if (annotation != null) {
            return sensitiveDataHidingSerializer;
        }

        return super.findSerializer(a);
    }


}
