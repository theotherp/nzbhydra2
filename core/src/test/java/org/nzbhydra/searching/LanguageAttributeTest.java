package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LanguageAttributeTest {

    @Test
    void shouldSplitCombinedLanguages() {
        assertThat(LanguageAttribute.split("English - Japanese")).containsExactly("English", "Japanese");
        assertThat(LanguageAttribute.split("English, Japanese")).containsExactly("English", "Japanese");
        assertThat(LanguageAttribute.split("English/Japanese")).containsExactly("English", "Japanese");
        assertThat(LanguageAttribute.split("English | Japanese")).containsExactly("English", "Japanese");
        assertThat(LanguageAttribute.split("English - Chinese - Czech")).containsExactly("English", "Chinese", "Czech");
    }

    @Test
    void shouldKeepSingleAndHyphenatedValues() {
        assertThat(LanguageAttribute.split("English")).containsExactly("English");
        assertThat(LanguageAttribute.split("Chinese-Mandarin")).containsExactly("Chinese-Mandarin");
        assertThat(LanguageAttribute.split("  German  ")).containsExactly("German");
    }

    @Test
    void shouldReturnNothingForBlank() {
        assertThat(LanguageAttribute.split(null)).isEmpty();
        assertThat(LanguageAttribute.split("  ")).isEmpty();
        assertThat(LanguageAttribute.split(" - ")).isEmpty();
    }

    @Test
    void shouldRecogniseTheAttributeNameCaseInsensitively() {
        assertThat(LanguageAttribute.isLanguage("language")).isTrue();
        assertThat(LanguageAttribute.isLanguage("Language")).isTrue();
        assertThat(LanguageAttribute.isLanguage("subs")).isFalse();
    }
}
