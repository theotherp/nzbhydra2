package org.nzbhydra.database;

import lombok.AllArgsConstructor;
import lombok.Data;

import javax.persistence.Entity;


@Data
@Entity
@AllArgsConstructor
public class IdentifierKeyValuePair {

    private String identifierKey;
    private String identifierValue;


}
