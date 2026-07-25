

package org.nzbhydra.mapping.newznab.json;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.nzbhydra.mapping.newznab.xml.Xml;
import org.nzbhydra.springnative.ReflectionMarker;

@NoArgsConstructor
@AllArgsConstructor
@Data
@ReflectionMarker
@EqualsAndHashCode(callSuper = true)
public class NewznabJsonError extends Xml {

    private String code;
    private String description;
}
