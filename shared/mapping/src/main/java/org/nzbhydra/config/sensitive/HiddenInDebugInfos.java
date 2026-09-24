package org.nzbhydra.config.sensitive;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field whose value is removed from the config included in the debug infos, like one with
 * {@link SensitiveData}, but which is neither a secret nor encrypted in the config file. Used for values that identify
 * the user or their network (their domain, internal hosts) without granting access to anything.
 * <p>
 * Works on {@code String} fields and on collections of strings, whose elements are each replaced so that the number of
 * entries stays visible.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface HiddenInDebugInfos {
}
