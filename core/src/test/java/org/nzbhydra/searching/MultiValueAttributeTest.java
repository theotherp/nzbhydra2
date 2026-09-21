package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MultiValueAttributeTest {

    @Test
    void shouldSplitCombinedValues() {
        assertThat(MultiValueAttribute.LANGUAGE.split("English - Japanese")).containsExactly("English", "Japanese");
        assertThat(MultiValueAttribute.LANGUAGE.split("English, Japanese")).containsExactly("English", "Japanese");
        assertThat(MultiValueAttribute.LANGUAGE.split("English,Japanese")).containsExactly("English", "Japanese");
        assertThat(MultiValueAttribute.LANGUAGE.split("English/Japanese")).containsExactly("English", "Japanese");
        assertThat(MultiValueAttribute.LANGUAGE.split("English | Japanese")).containsExactly("English", "Japanese");
        assertThat(MultiValueAttribute.LANGUAGE.split("English - Chinese - Czech")).containsExactly("English", "Chinese", "Czech");
        assertThat(MultiValueAttribute.SUBS.split("Dutch / English / English / French")).containsExactly("Dutch", "English", "English", "French");
    }

    @Test
    void shouldKeepSingleAndHyphenatedValues() {
        assertThat(MultiValueAttribute.LANGUAGE.split("English")).containsExactly("English");
        assertThat(MultiValueAttribute.LANGUAGE.split("Chinese-Mandarin")).containsExactly("Chinese-Mandarin");
        assertThat(MultiValueAttribute.LANGUAGE.split("  German  ")).containsExactly("German");
    }

    @Test
    void shouldReturnNothingForBlank() {
        assertThat(MultiValueAttribute.LANGUAGE.split(null)).isEmpty();
        assertThat(MultiValueAttribute.LANGUAGE.split("  ")).isEmpty();
        assertThat(MultiValueAttribute.LANGUAGE.split(" - ")).isEmpty();
    }

    @Test
    void shouldMatchTheAttributeNameCaseInsensitively() {
        assertThat(MultiValueAttribute.LANGUAGE.matches("language")).isTrue();
        assertThat(MultiValueAttribute.LANGUAGE.matches("Language")).isTrue();
        assertThat(MultiValueAttribute.LANGUAGE.matches("subs")).isFalse();
        assertThat(MultiValueAttribute.SUBS.matches("subs")).isTrue();
        assertThat(MultiValueAttribute.SUBS.matches("Subs")).isTrue();
        assertThat(MultiValueAttribute.SUBS.matches("language")).isFalse();
    }

    @Test
    void shouldRecogniseAnyMultiValueAttributeName() {
        assertThat(MultiValueAttribute.isMultiValue("language")).isTrue();
        assertThat(MultiValueAttribute.isMultiValue("subs")).isTrue();
        assertThat(MultiValueAttribute.isMultiValue("group")).isFalse();
    }
}
