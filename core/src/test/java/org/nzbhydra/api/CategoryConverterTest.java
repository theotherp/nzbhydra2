package org.nzbhydra.api;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.searching.CategoryProvider;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.when;

public class CategoryConverterTest {

    @InjectMocks
    CategoryConverter testee = new CategoryConverter();

    @Mock
    private CategoryProvider categoryProviderMock;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.setCategoryProvider(categoryProviderMock);
    }


    @Test
    public void convertToDatabaseColumn() throws Exception {
        Category category = new Category();
        category.setName("name");
        assertThat(testee.convertToDatabaseColumn(category), is("name"));
    }


    @Test
    public void convertToEntityAttribute() throws Exception {
        Category category = new Category();
        when(categoryProviderMock.getByInternalName("name")).thenReturn(category);
        assertThat(testee.convertToEntityAttribute("name"), is(category));
    }

}