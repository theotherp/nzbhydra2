

package org.nzbhydra.searching.db;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.Objects;


@Data
@ReflectionMarker
@Entity
@NoArgsConstructor
public final class IdentifierKeyValuePair {

    @Id
    @GeneratedValue
    @JsonIgnore
    @SequenceGenerator(allocationSize = 1, name = "IDENTIFIER_KEY_VALUE_PAIR_SEQ")
    private Integer id;

    public IdentifierKeyValuePair(String identifierKey, String identifierValue) {
        this.identifierKey = identifierKey;
        this.identifierValue = identifierValue;
    }

    private String identifierKey;
    private String identifierValue;


    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        IdentifierKeyValuePair that = (IdentifierKeyValuePair) o;
        return Objects.equals(identifierKey, that.identifierKey) &&
                Objects.equals(identifierValue, that.identifierValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(identifierKey, identifierValue);
    }
}
