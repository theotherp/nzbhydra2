package org.nzbhydra.tests.pageobjects;

 public interface IColumnSortable {

     void toggleSort();
     void sortAscending();
     void sortDescending();
     boolean isSorted();
     boolean isSortedAscending();
     boolean isSortedDescending();

}
