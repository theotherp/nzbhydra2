package org.nzbhydra.config;

import com.google.common.base.Strings;

import java.util.List;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public abstract class ValidatingConfig {

    /**
     * @return a list of error messages or an empty list when everything is fine
     */
    public abstract List<String> validateConfig();

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
