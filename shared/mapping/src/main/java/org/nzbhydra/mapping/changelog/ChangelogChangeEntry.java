package org.nzbhydra.mapping.changelog;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class ChangelogChangeEntry {

    private String type;
    private String text;
}
