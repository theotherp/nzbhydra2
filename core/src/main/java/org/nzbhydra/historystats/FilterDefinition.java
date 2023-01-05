package org.nzbhydra.historystats;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class FilterDefinition {

    private Object filterValue;
    private Object filterType;
    private boolean isBoolean;
}
