

package org.nzbhydra.searching.dtoseventsenums;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class RejectionReason {

    public static RejectionReason WHATEVER = new RejectionReason("whatever", "Some reason");

    private String id;
    private String description;
}
