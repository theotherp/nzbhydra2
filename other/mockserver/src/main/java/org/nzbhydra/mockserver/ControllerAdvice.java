package org.nzbhydra.mockserver;

import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.springframework.web.bind.WebDataBinder;
import org.springframework.web.bind.annotation.InitBinder;

@org.springframework.web.bind.annotation.ControllerAdvice
public class ControllerAdvice {

    @InitBinder
    public void initBinder(WebDataBinder binder) {
        binder.registerCustomEditor(ActionAttribute.class, new EnumCaseInsensitiveConverter<>(ActionAttribute.class));
    }
}
