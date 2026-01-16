

package org.nzbhydra.exceptionanalyzers;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;
import org.yaml.snakeyaml.error.YAMLException;

public class YAMLExceptionAnalyzer extends AbstractFailureAnalyzer<YAMLException> {
    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, YAMLException cause) {
        return new FailureAnalysis("The file nzbhydra.yml in the data folder could not be loaded. It might be corrupt", "Delete file to start with an initial config or restore from a backup", cause);
    }
}
