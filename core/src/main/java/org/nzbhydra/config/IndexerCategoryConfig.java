package org.nzbhydra.config;

import lombok.Setter;

import java.util.Optional;

@Setter
public class IndexerCategoryConfig {

    private Integer anime = null;
    private Integer audiobook = null;
    private Integer comic = null;
    private Integer ebook = null;
    private Integer magazine = null;

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


}
