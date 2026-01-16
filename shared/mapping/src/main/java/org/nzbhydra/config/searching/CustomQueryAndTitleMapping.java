

package org.nzbhydra.config.searching;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.StringJoiner;
import java.util.regex.Pattern;

@Data
@ReflectionMarker
public class CustomQueryAndTitleMapping {

    private SearchType searchType;
    private AffectedValue affectedValue;
    private boolean matchAll;
    private String from;
    private String to;
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
