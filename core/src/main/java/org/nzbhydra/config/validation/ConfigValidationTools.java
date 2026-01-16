

package org.nzbhydra.config.validation;

import com.google.common.base.Strings;
import org.nzbhydra.config.RestartRequired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

public class ConfigValidationTools {

    private static final Logger logger = LoggerFactory.getLogger(ConfigValidationTools.class);

    static void checkRegex(List<String> errorMessages, String regex, String errorMessage) {
        if (!Strings.isNullOrEmpty(regex)) {
            try {
                Pattern.compile(regex);
            } catch (PatternSyntaxException e) {
                errorMessages.add(errorMessage);
            }
        }
    }

    /**
     * Detects if any setting was changed that requires a restart to be effective
     *
     * @param oldConfig the old config (its settings will be compared with the ones from the calling instance)
     * @return
     */
    public static boolean isRestartNeeded(Object oldConfig, Object newConfig) {
        for (Field field : oldConfig.getClass().getDeclaredFields()) {
            if (field.isAnnotationPresent(RestartRequired.class)) {
                try {
                    //PropertyDescriptor doesn't work for some reason, this is just as fine for what we need
                    String getterName = (field.getType() == Boolean.class || field.getType() == boolean.class ? "is" : "get") + field.getName().substring(0, 1).toUpperCase() + field.getName().substring(1);
                    Method method = oldConfig.getClass().getDeclaredMethod(getterName);
                    Object oldValue = method.invoke(oldConfig);
                    Object newValue = method.invoke(newConfig);

                    if (!Objects.equals(oldValue, newValue)) {
                        logger.debug("Restart needed because field {} has changed", field.getName());
                        return true;
                    }
                } catch (InvocationTargetException | NoSuchMethodException | IllegalAccessException e) {
                    logger.error("Unable to determine if field '{}' in class {} was changed", field.getName(), oldConfig.getClass().getName());
                }
            }
        }
        return false;
    }
}
