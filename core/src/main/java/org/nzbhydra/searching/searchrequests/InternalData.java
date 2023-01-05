package org.nzbhydra.searching.searchrequests;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Data
@ReflectionMarker
public class InternalData {

    public enum FallbackState {
        NOT_USED,
        REQUESTED,
        USED
    }

    private String title;
    private final Map<String, FallbackState> fallbackState = new HashMap<>();
    private List<String> forbiddenWords = new ArrayList<>();
    private List<String> requiredWords = new ArrayList<>();
    private List<Integer> newznabCategories = new ArrayList<>();
    private boolean includePasswords = false;
    private boolean queryGenerated = false;

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }

    public FallbackState getFallbackStateByIndexer(String indexerName) {
        synchronized (fallbackState) {
            return fallbackState.computeIfAbsent(indexerName, s -> FallbackState.NOT_USED);
        }
    }

    public void setFallbackStateByIndexer(String indexerName, FallbackState fallbackState) {
        synchronized (this.fallbackState) {
            this.fallbackState.put(indexerName, fallbackState);
        }
    }

}
