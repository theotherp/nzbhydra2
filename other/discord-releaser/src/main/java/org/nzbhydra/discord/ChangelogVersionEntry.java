package org.nzbhydra.discord;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangelogVersionEntry implements Comparable<ChangelogVersionEntry> {

    private String version;
    private String date;
    private boolean isFinal = true;
    private List<ChangelogChangeEntry> changes;

    @Override
    public int compareTo(ChangelogVersionEntry o) {
        return new SemanticVersion(version).compareTo(new SemanticVersion(o.getVersion()));
    }
}
