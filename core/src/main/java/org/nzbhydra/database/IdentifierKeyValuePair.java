package org.nzbhydra.database;

import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import java.util.Objects;


@Data
@Entity
@NoArgsConstructor
public class IdentifierKeyValuePair {

    @Id
    @GeneratedValue
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
        if (!super.equals(o)) {
            return false;
        }
        IdentifierKeyValuePair that = (IdentifierKeyValuePair) o;
        return Objects.equals(identifierKey, that.identifierKey) &&
                Objects.equals(identifierValue, that.identifierValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), identifierKey, identifierValue);
    }
}
