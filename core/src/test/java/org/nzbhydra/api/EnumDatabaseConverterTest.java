package org.nzbhydra.api;

import org.junit.Test;
import org.nzbhydra.searching.SearchType;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;

public class EnumDatabaseConverterTest {
    @Test
    public void convertToDatabaseColumn() throws Exception {
        EnumDatabaseConverter converter = new EnumDatabaseConverter();
        assertThat(converter.convertToDatabaseColumn(SearchType.BOOK), is("BOOK"));
        assertThat(converter.convertToDatabaseColumn(SearchType.MOVIE), is("MOVIE"));
        assertThat(converter.convertToDatabaseColumn(SearchType.SEARCH), is("SEARCH"));
        assertThat(converter.convertToDatabaseColumn(SearchType.TVSEARCH), is("TVSEARCH"));
    }



    @Test
    public void convertToEntityAttribute() throws Exception {
        EnumDatabaseConverter converter = new EnumDatabaseConverter();
        assertThat(converter.convertToEntityAttribute("BOOK"), is(SearchType.BOOK));
    }

}