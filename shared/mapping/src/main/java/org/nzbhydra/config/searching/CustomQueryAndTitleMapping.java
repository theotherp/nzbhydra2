

package org.nzbhydra.config.searching;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;
import java.util.regex.Pattern;

@Data
@ReflectionMarker
public class CustomQueryAndTitleMapping {

    /**
     * Optional label shown in the UI. Older configs don't have it, in which case the mapping is described by its input pattern.
     */
    private String name;
    /**
     * Mappings can be disabled without deleting them. Older configs don't have the key, so the initializer makes them enabled.
     */
    private boolean enabled = true;
    private SearchType searchType;
    private AffectedValue affectedValue;
    private boolean matchAll;
    private String from;
    private String to;
    /**
     * Example inputs the user saved with the mapping so the test dialog can replay them. Older configs don't have the key.
     */
    private List<String> examples = new ArrayList<>();
    @JsonIgnore
    @DiffIgnore
    private Pattern fromPattern;

    public CustomQueryAndTitleMapping() {
    }

    public CustomQueryAndTitleMapping(String configValue) {
        final String[] split = configValue.split(";");
        if (split.length < 4 || split.length > 5) {
            throw new IllegalArgumentException("Unable to parse value: " + configValue);
        }
        this.searchType = split[0].equals("null") ? SearchType.SEARCH : SearchType.valueOf(split[0].toUpperCase());
        this.affectedValue = AffectedValue.valueOf(split[1].toUpperCase());
        this.from = split[2];
        this.to = split[3];
        this.matchAll = split.length == 4 || Boolean.parseBoolean(split[4]);
    }

    /**
     * Returns a detached copy. Callers that need to change a mapping for an evaluation (e.g. forcing the affected value for a test run)
     * must work on a copy because the instances in the list belong to the config and would be persisted with the changed values.
     */
    public CustomQueryAndTitleMapping copy() {
        final CustomQueryAndTitleMapping copy = new CustomQueryAndTitleMapping();
        copy.setName(name);
        copy.setEnabled(enabled);
        copy.setSearchType(searchType);
        copy.setAffectedValue(affectedValue);
        copy.setMatchAll(matchAll);
        copy.setFrom(from);
        copy.setTo(to);
        copy.setExamples(examples == null ? new ArrayList<>() : new ArrayList<>(examples));
        return copy;
    }

    @JsonIgnore
    public Pattern getFromPattern() {
        if (fromPattern == null) {
            String regex = from.replaceAll("\\{(?<groupName>\\D\\w*):(?<hydraContent>[^\\{\\}]*)\\}", "(?<hydra${groupName}>${hydraContent})");
            fromPattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        }
        return fromPattern;
    }

    @Override
    public String toString() {
        return new StringJoiner(", ", CustomQueryAndTitleMapping.class.getSimpleName() + "[", "]")
            .add("from='" + from + "'")
            .add("to='" + to + "'")
            .toString();
    }
}
