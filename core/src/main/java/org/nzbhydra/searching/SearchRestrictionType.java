package org.nzbhydra.searching;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonFormat.Shape;

@JsonFormat(shape = Shape.STRING)
public enum SearchRestrictionType {

    NONE,
    API,
    INTERNAL,
    BOTH

}
