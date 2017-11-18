package org.nzbhydra.springconfig;

import java.beans.PropertyEditorSupport;

//http://stackoverflow.com/a/30623654/184264
public class EnumCaseInsensitiveConverter<T extends Enum<T>> extends PropertyEditorSupport {

    private final Class<T> typeParameterClass;

    public EnumCaseInsensitiveConverter(Class<T> typeParameterClass) {
        super();
        this.typeParameterClass = typeParameterClass;
    }

    @Override
    public void setAsText(final String text) throws IllegalArgumentException {
        String upper = text.toUpperCase(); // or something more robust
        T value = T.valueOf(typeParameterClass, upper);
        setValue(value);
    }
}