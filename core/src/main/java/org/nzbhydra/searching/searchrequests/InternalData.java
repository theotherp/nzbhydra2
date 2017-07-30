package org.nzbhydra.searching.searchrequests;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Data
public class InternalData {

    public enum FallbackState {
        NOT_USED,
        REQUESTED,
        USED
    }

    private String title;
    private String usernameOrIp = null; //Needs to be filled because searcher doesn't know if we're internal or external (which determines if IP or username is saved)
    private FallbackState fallbackState = FallbackState.NOT_USED;
    private List<String> excludedWords = new ArrayList<>();
    private List<String> requiredWords = new ArrayList<>();
    private List<Integer> newznabCategories = new ArrayList<>();

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }
}
