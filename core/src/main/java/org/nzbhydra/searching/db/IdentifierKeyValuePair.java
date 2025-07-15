/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.searching.db;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore
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
