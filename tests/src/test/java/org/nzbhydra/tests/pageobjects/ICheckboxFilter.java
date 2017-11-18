package org.nzbhydra.tests.pageobjects;

import java.util.List;

public interface ICheckboxFilter {

    void filterBy(List<String> values);

    void selectAll();

    void invertSelection();

    void clear();
}
