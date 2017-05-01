package org.nzbhydra.searching.searchrequests;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class InternalData {

    private String title;
    private boolean loadAll;
    private String usernameOrIp = null;
    private List<String> excludedWords = new ArrayList<>();
    private List<String> requiredWords = new ArrayList<>(); //TODO When is this filled?

}
