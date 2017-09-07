package org.nzbhydra.mapping.changelog;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChangelogChangeEntry {

    private String type;
    private String text;
}
