package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.searching.CategoryProvider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class CategoryConverterTest {

    @InjectMocks
    CategoryConverter testee = new CategoryConverter();

    @Mock
    private CategoryProvider categoryProviderMock;

    @BeforeEach
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        testee.setCategoryProvider(categoryProviderMock);
    }


    @Test
    void convertToDatabaseColumn() throws Exception {
        Category category = new Category();
        category.setName("name");
        assertThat(testee.convertToDatabaseColumn(category)).isEqualTo("name");
    }


    @Test
    void convertToEntityAttribute() throws Exception {
        Category category = new Category();
        when(categoryProviderMock.getByInternalName("name")).thenReturn(category);
        assertThat(testee.convertToEntityAttribute("name")).isEqualTo(category);
    }

}
