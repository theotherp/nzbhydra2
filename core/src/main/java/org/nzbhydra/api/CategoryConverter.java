package org.nzbhydra.api;

import org.nzbhydra.config.Category;
import org.nzbhydra.searching.CategoryProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;


@Converter
@Component
public class CategoryConverter implements AttributeConverter<Category, String> {


    private static CategoryProvider categoryProvider;

    @Autowired
    public void setCategoryProvider(CategoryProvider categoryProvider) {
        CategoryConverter.categoryProvider = categoryProvider;
    }


    @Override
    public String convertToDatabaseColumn(Category category) {
        if (category == null) {
            return null;
        }
        return category.getName();
    }

    @Override
    public Category convertToEntityAttribute(String categoryName) {
        return categoryProvider.getByInternalName(categoryName);
    }
}
