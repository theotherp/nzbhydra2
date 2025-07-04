import {Component, Input, OnInit} from "@angular/core";
import {SearchResponse, SearchResultWebTO} from "../../services/search.service";

export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface FilterConfig {
  title?: string;
  indexer?: string[];
  category?: string[];
  size?: { min?: number; max?: number };
  details?: { min?: number; max?: number };
  age?: { min?: number; max?: number };
}

@Component({
  selector: "app-search-results",
  templateUrl: "./search-results.component.html",
  styleUrls: ["./search-results.component.css"],
  standalone: false
})
export class SearchResultsComponent implements OnInit {
  @Input() searchResponse?: SearchResponse;
  @Input() isLoading = false;


  // Display properties
  currentPage = 1;
  pageSize = 100;
  totalPages = 0;

  // Sorting and filtering
  sortConfig: SortConfig = {column: "age", direction: "desc"};
  filterConfig: FilterConfig = {};

  // Available filter options
  availableIndexers: string[] = [];
  availableCategories: string[] = [];

  // Filtered and sorted results
  filteredResults: SearchResultWebTO[] = [];
  displayedResults: SearchResultWebTO[] = [];

  ngOnInit() {
    this.updateResults();
  }

  ngOnChanges() {
    this.updateResults();
  }

  updateResults() {
    if (!this.searchResponse?.searchResults) {
      this.filteredResults = [];
      this.displayedResults = [];
      this.totalPages = 0;
      return;
    }

    // Reset filter config for new results
    this.filterConfig = {};

    // Extract available filter options
    this.extractFilterOptions();

    // Ensure default filters
    this.ensureDefaultFilters();

    // Apply filters and sorting
    this.applyFiltersAndSorting();

    // Calculate pagination
    this.calculatePagination();

    // Get current page results
    this.updateDisplayedResults();
  }

  extractFilterOptions() {
    if (!this.searchResponse?.searchResults) {
      return;
    }

    const indexers = new Set<string>();
    const categories = new Set<string>();

    this.searchResponse.searchResults.forEach(result => {
      if (result.indexer) {
        indexers.add(result.indexer);
      }
      if (result.category) {
        categories.add(result.category);
      }
    });

    this.availableIndexers = Array.from(indexers).sort();
    this.availableCategories = Array.from(categories).sort();
  }


  ensureDefaultFilters() {
    // If no filter set or empty array, select all by default
    if (!this.filterConfig.indexer || this.filterConfig.indexer.length === 0) {
      this.filterConfig.indexer = [...this.availableIndexers];
    }
    if (!this.filterConfig.category || this.filterConfig.category.length === 0) {
      this.filterConfig.category = [...this.availableCategories];
    }
  }

  applyFiltersAndSorting() {
    if (!this.searchResponse?.searchResults) {
      this.filteredResults = [];
      return;
    }

    let results = [...this.searchResponse.searchResults];

    // Apply filters
    results = this.applyFilters(results);

    // Apply sorting
    results = this.applySorting(results);

    this.filteredResults = results;
  }

  applyFilters(results: SearchResultWebTO[]): SearchResultWebTO[] {
    return results.filter(result => {
      // Title filter
      if (this.filterConfig.title && this.filterConfig.title.trim()) {
        const title = result.title?.toLowerCase() || "";
        const filterTitle = this.filterConfig.title.toLowerCase();
        if (!title.includes(filterTitle)) {
          return false;
        }
      }

      // Indexer filter
      if (this.filterConfig.indexer && this.filterConfig.indexer.length > 0) {
        if (!result.indexer || !this.filterConfig.indexer.includes(result.indexer)) {
          return false;
        }
      }

      // Category filter
      if (this.filterConfig.category && this.filterConfig.category.length > 0) {
        if (!result.category || !this.filterConfig.category.includes(result.category)) {
          return false;
        }
      }

      // Size filter
      if (this.filterConfig.size) {
        const sizeMB = result.size / (1024 * 1024);
        if (this.filterConfig.size.min && sizeMB < this.filterConfig.size.min) {
          return false;
        }
        if (this.filterConfig.size.max && sizeMB > this.filterConfig.size.max) {
          return false;
        }
      }

      // Details filter (grabs)
      if (this.filterConfig.details) {
        const grabs = result.grabs || 0;
        if (this.filterConfig.details.min && grabs < this.filterConfig.details.min) {
          return false;
        }
        if (this.filterConfig.details.max && grabs > this.filterConfig.details.max) {
          return false;
        }
      }

      // Age filter
      if (this.filterConfig.age) {
        const age = result.age || 0;
        if (this.filterConfig.age.min && age < this.filterConfig.age.min) {
          return false;
        }
        if (this.filterConfig.age.max && age > this.filterConfig.age.max) {
          return false;
        }
      }

      return true;
    });
  }

  applySorting(results: SearchResultWebTO[]): SearchResultWebTO[] {
    return results.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortConfig.column) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "indexer":
          aValue = a.indexer?.toLowerCase() || "";
          bValue = b.indexer?.toLowerCase() || "";
          break;
        case "category":
          aValue = a.category?.toLowerCase() || "";
          bValue = b.category?.toLowerCase() || "";
          break;
        case "size":
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case "details":
          aValue = a.grabs || 0;
          bValue = b.grabs || 0;
          break;
        case "age":
          aValue = a.age || 0;
          bValue = b.age || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredResults.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  updateDisplayedResults() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedResults = this.filteredResults.slice(startIndex, endIndex);
  }

  // Sorting methods
  sortBy(column: string) {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === "asc" ? "desc" : "asc";
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = "asc";
    }
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  onSortIconClick(event: Event, column: string) {
    event.stopPropagation();
    this.sortBy(column);
  }

  getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) {
      return "bi-arrow-down-up";
    }
    return this.sortConfig.direction === "asc" ? "bi-arrow-up" : "bi-arrow-down";
  }

  // Filtering methods
  updateTitleFilter(value: string) {
    this.filterConfig.title = value;
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateIndexerFilter(indexers: string[]) {
    this.filterConfig.indexer = indexers.length > 0 ? indexers : [];
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateCategoryFilter(categories: string[]) {
    this.filterConfig.category = categories.length > 0 ? categories : [];
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateSizeFilter(min?: number, max?: number) {
    this.filterConfig.size = {min, max};
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateDetailsFilter(min?: number, max?: number) {
    this.filterConfig.details = {min, max};
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateAgeFilter(min?: number, max?: number) {
    this.filterConfig.age = {min, max};
    this.currentPage = 1;
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedResults();
    }
  }

  get hasResults(): boolean {
    return !!(this.searchResponse && this.searchResponse.numberOfAcceptedResults > 0);
  }

  get totalResults(): number {
    return this.searchResponse?.numberOfAcceptedResults || 0;
  }

  get availableResults(): number {
    return this.searchResponse?.numberOfAvailableResults || 0;
  }

  get rejectedResults(): number {
    return this.searchResponse?.numberOfRejectedResults || 0;
  }

  get duplicateResults(): number {
    return this.searchResponse?.numberOfDuplicateResults || 0;
  }

  get processedResults(): number {
    return this.searchResponse?.numberOfProcessedResults || 0;
  }

  get filteredCount(): number {
    return this.filteredResults.length;
  }

  // Utility methods
  formatSize(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatAge(age: number): string {
    if (age < 1) {
      return "< 1 day";
    }
    if (age === 1) {
      return "1 day";
    }
    return `${age} days`;
  }

  // Helper methods for template
  getUpdatedFilterValues(filterType: "indexer" | "category", value: string, event: any): string[] {
    const currentValues = this.filterConfig[filterType] || [];
    const isChecked = event.target.checked;

    if (isChecked) {
      return [...currentValues, value];
    } else {
      return currentValues.filter(v => v !== value);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Filter helpers
  isFilterActive(type: "indexer" | "category"): boolean {
    if (type === "indexer") {
      return (this.filterConfig.indexer?.length ?? 0) < this.availableIndexers.length;
    }
    if (type === "category") {
      return (this.filterConfig.category?.length ?? 0) < this.availableCategories.length;
    }
    return false;
  }

  isRangeFilterActive(type: "size" | "details" | "age"): boolean {
    const filter = this.filterConfig[type];
    return !!(filter && (filter.min || filter.max));
  }

  isTitleFilterActive(): boolean {
    return !!(this.filterConfig.title && this.filterConfig.title.trim().length > 0);
  }

  // Handle Enter key in filter inputs
  onFilterInputKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      this.closeDropdown(event);
    }
  }

  closeDropdown(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest(".dropdown-menu");
    if (dropdown) {
      dropdown.classList.remove("show");
    }
  }

  // Make Math available in template
  get Math() {
    return Math;
  }
} 