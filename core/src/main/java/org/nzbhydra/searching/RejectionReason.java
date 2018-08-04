package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RejectionReason {

    public static RejectionReason WHATEVER = new RejectionReason("whatever", "Some reason");

    private String id;
    private String description;
}
