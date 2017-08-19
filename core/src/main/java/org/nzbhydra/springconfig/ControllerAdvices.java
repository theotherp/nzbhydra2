package org.nzbhydra.springconfig;

import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.InitBinder;

@org.springframework.web.bind.annotation.ControllerAdvice
public class ControllerAdvices {

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(ActionAttribute.class, new EnumCaseInsensitiveConverter<>(ActionAttribute.class));
    }
}
