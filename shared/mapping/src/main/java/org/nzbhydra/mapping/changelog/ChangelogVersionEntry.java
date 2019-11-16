package org.nzbhydra.mapping.changelog;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.mapping.SemanticVersion;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangelogVersionEntry implements Comparable<ChangelogVersionEntry> {

    private String version;
    private String date;
    private List<ChangelogChangeEntry> changes;

    @Override
    public int compareTo(ChangelogVersionEntry o) {
        return new SemanticVersion(version).compareTo(new SemanticVersion(o.getVersion()));
    }
}
