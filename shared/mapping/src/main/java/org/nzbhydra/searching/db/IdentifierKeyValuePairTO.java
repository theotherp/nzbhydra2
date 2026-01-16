

package org.nzbhydra.searching.db;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ReflectionMarker
public class IdentifierKeyValuePairTO {

    private String identifierKey;
    private String identifierValue;
}
