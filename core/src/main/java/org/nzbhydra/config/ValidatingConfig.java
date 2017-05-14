package org.nzbhydra.config;

import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public abstract class ValidatingConfig {

    /**
     * @return a list of error messages or an empty list when everything is fine
     */
    public abstract ConfigValidationResult validateConfig();

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ConfigValidationResult {
        private boolean ok;
        private List<String> errorMessages = new ArrayList<>();
        private List<String> warningMessages = new ArrayList<>();
    }

    protected void checkRegex(List<String> errorMessages, String regex, String errorMessage) {
        if (!Strings.isNullOrEmpty(regex)) {
            try {
                Pattern.compile(regex);
            } catch (PatternSyntaxException e) {
                errorMessages.add(errorMessage);
            }
        }
    }

}
