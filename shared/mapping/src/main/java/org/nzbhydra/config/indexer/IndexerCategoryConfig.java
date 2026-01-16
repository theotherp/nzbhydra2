

package org.nzbhydra.config.indexer;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Setter
public class IndexerCategoryConfig {

    private Integer anime = null;
    private Integer audiobook = null;
    private Integer comic = null;
    private Integer ebook = null;
    private Integer magazine = null;
    private List<MainCategory> categories = new ArrayList<>();

    @JsonIgnore
    @Setter(AccessLevel.NONE)
    private Map<Integer, String> idsToNames;

    public Optional<Integer> getAnime() {
        return Optional.ofNullable(anime);
    }

    public Optional<Integer> getAudiobook() {
        return Optional.ofNullable(audiobook);
    }

    public Optional<Integer> getComic() {
        return Optional.ofNullable(comic);
    }

    public Optional<Integer> getEbook() {
        return Optional.ofNullable(ebook);
    }

    public Optional<Integer> getMagazine() {
        return Optional.ofNullable(magazine);
    }

    public List<MainCategory> getCategories() {
        return categories;
    }

    public void setCategories(List<MainCategory> categories) {
        this.categories = categories;
        initMap();
    }

    public String getNameFromId(int id) {
        if (idsToNames == null) {
            initMap();
        }
        return idsToNames.getOrDefault(id, "N/A");
    }

    protected void initMap() {
        idsToNames = new HashMap<>();
        for (MainCategory category : categories) {
            for (SubCategory subCategory : category.getSubCategories()) {
                idsToNames.put(subCategory.getId(), category.getName() + " " + subCategory.getName());
            }
            idsToNames.put(category.getId(), category.getName());
        }
    }


    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MainCategory {
        private int id;
        private String name;
        private List<SubCategory> subCategories = new ArrayList<>();
    }

    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SubCategory {
        private int id;
        private String name;
    }


}
