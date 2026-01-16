

package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;

@Data
@ReflectionMarker
public class ExternalToolsConfig {

    private List<ExternalToolConfig> externalTools = new ArrayList<>();
    private boolean syncOnConfigChange = true;

    public void prepareForSaving() {
        externalTools.forEach(ExternalToolConfig::prepareForSaving);
    }
}