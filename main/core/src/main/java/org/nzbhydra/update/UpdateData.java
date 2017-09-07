package org.nzbhydra.update;

import lombok.Data;
import org.nzbhydra.mapping.SemanticVersion;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class UpdateData implements Serializable {

    protected List<SemanticVersion> ignoreVersions = new ArrayList<>();

}
