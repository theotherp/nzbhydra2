package org.nzbhydra.searching.searchrequests;

import lombok.Data;

import java.util.HashSet;
import java.util.Set;

@Data
public class InternalData {

    private String title;
    private boolean loadAll;
    private Set<String> excludedWords = new HashSet<>();
    private Set<String> requiredWords = new HashSet<>(); //TODO When is this filled?

}
