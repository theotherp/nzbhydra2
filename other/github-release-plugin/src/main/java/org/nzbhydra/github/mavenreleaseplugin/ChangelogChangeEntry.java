package org.nzbhydra.github.mavenreleaseplugin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangelogChangeEntry {

    private String type;
    private String text;
}
