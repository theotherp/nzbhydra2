package org.nzbhydra.web.mapping;

import lombok.Data;

@Data
public class FilterDefinition {

    private Object filterValue;
    private Object filterType;
    private boolean isBoolean;
}
