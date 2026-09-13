

package org.nzbhydra.config.validation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class ConfigValidationResult {
    private boolean ok = true;
    private boolean restartNeeded;
    private List<String> errorMessages = new ArrayList<>();
    private List<String> warningMessages = new ArrayList<>();
    private BaseConfig newConfig;

    public ConfigValidationResult(boolean ok, boolean restartNeeded, List<String> errorMessages, List<String> warningMessages) {
        this.ok = ok;
        this.restartNeeded = restartNeeded;
        this.errorMessages.addAll(new HashSet<>(errorMessages));
        this.warningMessages.addAll(new HashSet<>(warningMessages));
    }
}
