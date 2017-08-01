package org.nzbhydra.historystats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FilterDefinition {

    private Object filterValue;
    private Object filterType;
    private boolean isBoolean;
}
