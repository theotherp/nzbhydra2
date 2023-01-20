/*
 *  (C) Copyright 2022 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.database;

import org.h2.engine.Constants;
import org.hibernate.MappingException;
import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.dialect.H2Dialect;
import org.hibernate.dialect.SimpleDatabaseVersion;
import org.hibernate.dialect.sequence.ANSISequenceSupport;
import org.hibernate.dialect.sequence.SequenceSupport;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.tool.schema.extract.internal.SequenceInformationExtractorLegacyImpl;
import org.hibernate.tool.schema.extract.spi.SequenceInformationExtractor;

public class H2DialectExtended extends H2Dialect {

    public H2DialectExtended(DialectResolutionInfo info) {
        this();
    }

    public H2DialectExtended() {
        //Instance is created without DatabaseVersion info (or ZERO)
        super(new SimpleDatabaseVersion(Constants.VERSION_MAJOR, Constants.VERSION_MINOR, Constants.BUILD_ID));
    }

    public H2DialectExtended(DatabaseVersion version) {
        this();
    }

    @Override
    public String toBooleanValueString(boolean bool) {
        return bool ? "TRUE" : "FALSE";
    }

    @Override
    public SequenceInformationExtractor getSequenceInformationExtractor() {
        return SequenceInformationExtractorLegacyImpl.INSTANCE;
    }

    @Override
    public String getQuerySequencesString() {
        return "select * from INFORMATION_SCHEMA.SEQUENCES";
    }

    @Override
    public SequenceSupport getSequenceSupport() {
        return new ANSISequenceSupport() {
            @Override
            public String getSequenceNextValString(String sequenceName) throws MappingException {
                return "values next value for " + sequenceName;
            }
        };
    }
}
