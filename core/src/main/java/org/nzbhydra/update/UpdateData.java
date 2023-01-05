package org.nzbhydra.update;

import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@ReflectionMarker
public class UpdateData implements Serializable {

    private List<SemanticVersion> ignoreVersions = new ArrayList<>();

    public List<SemanticVersion> getIgnoreVersions() {
        return ignoreVersions;
    }

    public void setIgnoreVersions(List<SemanticVersion> ignoreVersions) {
        this.ignoreVersions = ignoreVersions;
    }
}
