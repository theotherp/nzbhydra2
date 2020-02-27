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
    private FallbackState fallbackState = FallbackState.NOT_USED;
    private List<String> forbiddenWords = new ArrayList<>();
    private List<String> requiredWords = new ArrayList<>();
    private List<Integer> newznabCategories = new ArrayList<>();
    private boolean includePasswords = false;

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }
}
