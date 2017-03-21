package org.nzbhydra.api;

import org.junit.Test;
import org.nzbhydra.searching.SearchType;

import static org.hamcrest.CoreMatchers.is;
import static org.junit.Assert.assertThat;

public class EnumDatabaseConverterTest {
    @Test
    public void convertToDatabaseColumn() throws Exception {
        EnumDatabaseConverter converter = new EnumDatabaseConverter();
        assertThat(converter.convertToDatabaseColumn(SearchType.BOOK), is(1));
        assertThat(converter.convertToDatabaseColumn(SearchType.MOVIE), is(2));
        assertThat(converter.convertToDatabaseColumn(SearchType.SEARCH), is(3));
        assertThat(converter.convertToDatabaseColumn(SearchType.TVSEARCH), is(4));
    }



    @Test
    public void convertToEntityAttribute() throws Exception {
        EnumDatabaseConverter converter = new EnumDatabaseConverter();
        //assertThat(converter.convertToEntityAttribute(1), is(SearchType.BOOK));
    }

}