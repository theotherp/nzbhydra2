import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {Downloader, DownloaderService} from "../../services/downloader.service";
import {LocalStorageService} from "../../services/local-storage.service";
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

export interface TitleGroup {
  title: string;
  groupingString: string;
  results: SearchResultWebTO[];
  isExpanded: boolean;
  hashGroups: HashGroup[];
  primaryResult: SearchResultWebTO;
}

export interface HashGroup {
  hash: string;
  results: SearchResultWebTO[];
  isExpanded: boolean;
  primaryResult: SearchResultWebTO;
}

export interface GroupedResult {
  type: "primary" | "grouped";
  titleGroup: TitleGroup;
  hashGroup: HashGroup;
  result: SearchResultWebTO;
  isExpanded: boolean;
  canExpand: boolean;
  isSelected?: boolean;
}

@Component({
    selector: "app-search-results",
    templateUrl: "./search-results.component.html",
    styleUrls: ["./search-results.component.scss"],
    standalone: false
})
export class SearchResultsComponent implements OnInit {
  @Input() searchResponse?: SearchResponse;
  @Input() isLoading = false;
  @Output() selectionChanged = new EventEmitter<SearchResultWebTO[]>();

  constructor(
      private localStorageService: LocalStorageService,
      private downloaderService: DownloaderService
  ) {
  }


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
  displayedResults: GroupedResult[] = [];

  // Grouped results
  titleGroups: TitleGroup[] = [];
  groupedResults: GroupedResult[] = [];

  // Selection state
  selectedResultsIds: Set<string> = new Set();
  lastSelectedIndex: number = -1;
  lastSelectionAction: "select" | "unselect" | null = null;
  showIndexerStatuses = false;

  // Downloader state
  enabledDownloaders: Downloader[] = [];

  ngOnInit() {
    this.loadSortConfig();
    this.loadEnabledDownloaders();
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
      this.resetSelection();
      return;
    }

    // Reset selection for new search results
    this.resetSelection();

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
      this.titleGroups = [];
      this.groupedResults = [];
      return;
    }

    let results = [...this.searchResponse.searchResults];

    // Apply filters
    results = this.applyFilters(results);

    this.filteredResults = results;

    // Group the results (sorting is handled within grouping)
    this.titleGroups = this.groupResults(results);
    this.groupedResults = this.createGroupedResults();

    // Debug logging
    console.log("Grouping:", {
      originalResults: results.length,
      titleGroups: this.titleGroups.length,
      groupedResults: this.groupedResults.length
    });
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
    this.totalPages = Math.ceil(this.groupedResults.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  updateDisplayedResults() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedResults = this.groupedResults.slice(startIndex, endIndex);

    // Debug logging
    console.log("Pagination:", {
      total: this.groupedResults.length,
      page: this.currentPage,
      pageSize: this.pageSize,
      startIndex,
      endIndex,
      displayedCount: this.displayedResults.length
    });
  }

  // Grouping methods
  getGroupingString(result: SearchResultWebTO): string {
    // Normalize title for grouping - remove common suffixes and prefixes
    let title = result.title?.toLowerCase() || "";

    // Remove common suffixes
    const suffixes = [
      "hdtv", "web-dl", "webrip", "bluray", "dvdrip", "xvid", "x264", "x265", "hevc",
      "aac", "ac3", "dts", "mp3", "flac", "mkv", "avi", "mp4", "m4v",
      "proper", "repack", "rerip", "extended", "directors.cut", "unrated",
      "1080p", "720p", "480p", "2160p", "4k", "uhd"
    ];

    suffixes.forEach(suffix => {
      // More flexible regex to match suffixes with various separators
      const regex = new RegExp(`[\\s\\.\\-_]${suffix}(?:[\\s\\.\\-_]|$)`, "gi");
      title = title.replace(regex, " ");
    });

    // Remove year patterns
    title = title.replace(/\(?\d{4}\)?/g, "");

    // Clean up extra spaces and normalize
    title = title.replace(/\s+/g, " ").trim();

    return title;
  }

  groupResults(results: SearchResultWebTO[]): TitleGroup[] {
    // Group by title first
    const titleGroupsMap = new Map<string, SearchResultWebTO[]>();

    results.forEach(result => {
      const groupingString = this.getGroupingString(result);
      if (!titleGroupsMap.has(groupingString)) {
        titleGroupsMap.set(groupingString, []);
      }
      titleGroupsMap.get(groupingString)!.push(result);
    });

    // Create title groups and sort them
    const titleGroups: TitleGroup[] = [];

    titleGroupsMap.forEach((results, groupingString) => {
      // Sort results within the title group
      const sortedResults = this.sortResultsWithinGroup(results);

      // Group by hash
      const hashGroupsMap = new Map<string, SearchResultWebTO[]>();
      sortedResults.forEach(result => {
        const hash = result.hash || "";
        if (!hashGroupsMap.has(hash)) {
          hashGroupsMap.set(hash, []);
        }
        hashGroupsMap.get(hash)!.push(result);
      });

      // Create hash groups
      const hashGroups: HashGroup[] = [];
      hashGroupsMap.forEach((hashResults, hash) => {
        const sortedHashResults = this.sortHashGroupResults(hashResults);
        hashGroups.push({
          hash,
          results: sortedHashResults,
          isExpanded: false,
          primaryResult: sortedHashResults[0]
        });
      });

      // Sort hash groups by their primary result
      hashGroups.sort((a, b) => {
        if (this.sortConfig.column === "title") {
          // Sort by indexer score first, then by age
          const scoreA = this.getResultIndexerScore(a.primaryResult);
          const scoreB = this.getResultIndexerScore(b.primaryResult);
          if (scoreA !== scoreB) {
            return scoreB - scoreA; // Higher score first
          }
          return (a.primaryResult.age || 0) - (b.primaryResult.age || 0); // Newer first (lower age first)
        } else {
          // Sort by the selected predicate
          return this.compareResults(a.primaryResult, b.primaryResult);
        }
      });

      titleGroups.push({
        title: sortedResults[0].title || "",
        groupingString,
        results: sortedResults,
        isExpanded: false, // Title groups are collapsed by default
        hashGroups,
        primaryResult: hashGroups[0]?.primaryResult || sortedResults[0]
      });
    });

    // Sort title groups by their first hash group's primary result
    titleGroups.sort((a, b) => {
      if (a.hashGroups.length === 0 || b.hashGroups.length === 0) {
        return 0;
      }
      return this.compareResults(a.hashGroups[0].primaryResult, b.hashGroups[0].primaryResult);
    });

    return titleGroups;
  }

  sortResultsWithinGroup(results: SearchResultWebTO[]): SearchResultWebTO[] {
    return results.sort((a, b) => this.compareResults(a, b));
  }

  sortHashGroupResults(results: SearchResultWebTO[]): SearchResultWebTO[] {
    if (this.sortConfig.column === "title") {
      // Sort by indexer score first, then by age
      return results.sort((a, b) => {
        const scoreA = this.getResultIndexerScore(a);
        const scoreB = this.getResultIndexerScore(b);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
        return (a.age || 0) - (b.age || 0); // Newer first (lower age first)
      });
    } else {
      // Sort by the selected predicate
      return results.sort((a, b) => this.compareResults(a, b));
    }
  }

  getIndexerScore(indexerName: string): number {
    // Simple scoring - can be enhanced later
    const scores: { [key: string]: number } = {
      "nzbgeek": 100,
      "dognzb": 90,
      "nzbplanet": 85,
      "nzb.su": 80,
      "omgwtfnzbs": 75,
      "nzbindex": 70,
      "binsearch": 50,
      "nzbs.org": 45
    };
    return scores[indexerName.toLowerCase()] || 0;
  }

  getResultIndexerScore(result: SearchResultWebTO): number {
    // Use the indexerscore property if available, otherwise fall back to indexer name scoring
    return (result as any).indexerscore || this.getIndexerScore(result.indexer);
  }

  compareResults(a: SearchResultWebTO, b: SearchResultWebTO): number {
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
  }

  createGroupedResults(): GroupedResult[] {
    const groupedResults: GroupedResult[] = [];

    this.titleGroups.forEach((titleGroup, tIdx) => {
      titleGroup.hashGroups.forEach((hashGroup, hashIndex) => {
        const isFirstHashGroup = hashIndex === 0;
        let resultsToShow: SearchResultWebTO[] = [];

        if (hashGroup.isExpanded) {
          resultsToShow = hashGroup.results;
        } else if (titleGroup.isExpanded) {
          resultsToShow = [hashGroup.results[0]];
        } else if (isFirstHashGroup) {
          resultsToShow = [hashGroup.results[0]];
        }

        resultsToShow.forEach((result, resultIndex) => {
          const isPrimaryResult = resultIndex === 0;
          const canExpand = hashGroup.results.length > 1 || titleGroup.hashGroups.length > 1;
          const isSelected = this.selectedResultsIds.has(result.searchResultId);

          groupedResults.push({
            type: isPrimaryResult && isFirstHashGroup ? "primary" : "grouped",
            titleGroup,
            hashGroup,
            result,
            isExpanded: titleGroup.isExpanded || hashGroup.isExpanded,
            canExpand,
            isSelected,
          });
        });

        // Debug: log what is being shown for this hash group
        console.debug("[GROUPED RESULTS]", {
          titleGroupIdx: tIdx,
          title: titleGroup.title,
          titleExpanded: titleGroup.isExpanded,
          hash: hashGroup.hash,
          hashExpanded: hashGroup.isExpanded,
          resultsToShow: resultsToShow.map(r => r.title)
        });
      });
    });

    // Debug: log the final grouped results
    console.debug("[FINAL GROUPED RESULTS]", groupedResults.map(gr => ({
      title: gr.titleGroup.title,
      hash: gr.hashGroup.hash,
      result: gr.result.title,
      isExpanded: gr.isExpanded,
      type: gr.type,
      isSelected: gr.isSelected
    })));

    return groupedResults;
  }

  toggleTitleGroupExpansion(titleGroup: TitleGroup) {
    titleGroup.isExpanded = !titleGroup.isExpanded;
    console.log("[TOGGLE TITLE GROUP]", {
      title: titleGroup.title,
      isExpanded: titleGroup.isExpanded,
      hashGroups: titleGroup.hashGroups.map(hg => ({hash: hg.hash, isExpanded: hg.isExpanded}))
    });
    this.updateGroupedResults();
  }

  toggleHashGroupExpansion(hashGroup: HashGroup) {
    hashGroup.isExpanded = !hashGroup.isExpanded;
    console.log("[TOGGLE HASH GROUP]", {
      hash: hashGroup.hash,
      isExpanded: hashGroup.isExpanded,
      results: hashGroup.results.map(r => r.title)
    });
    this.updateGroupedResults();
  }

  // Preserve selection when groups are collapsed/expanded
  private preserveSelection() {
    // The selection is already preserved because we use searchResultId as the key
    // and the selectedResults Set maintains the selection state
    // This method is here for future enhancements if needed
  }


  updateGroupedResults() {
    this.groupedResults = this.createGroupedResults();
    this.calculatePagination();
    this.updateDisplayedResults();
    this.emitSelectionChange();
  }

  private emitSelectionChange() {
    this.selectionChanged.emit(this.getSelectedResults());
  }

  // Sorting methods
  sortBy(column: string) {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === "asc" ? "desc" : "asc";
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = "asc";
    }
    this.saveSortConfig();
    this.resetSelectionState();
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
    this.resetSelectionState();
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateIndexerFilter(indexers: string[]) {
    this.filterConfig.indexer = indexers.length > 0 ? indexers : [];
    this.currentPage = 1;
    this.resetSelectionState();
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateCategoryFilter(categories: string[]) {
    this.filterConfig.category = categories.length > 0 ? categories : [];
    this.currentPage = 1;
    this.resetSelectionState();
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateSizeFilter(min?: number, max?: number) {
    this.filterConfig.size = {min, max};
    this.currentPage = 1;
    this.resetSelectionState();
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateDetailsFilter(min?: number, max?: number) {
    this.filterConfig.details = {min, max};
    this.currentPage = 1;
    this.resetSelectionState();
    this.applyFiltersAndSorting();
    this.calculatePagination();
    this.updateDisplayedResults();
  }

  updateAgeFilter(min?: number, max?: number) {
    this.filterConfig.age = {min, max};
    this.currentPage = 1;
    this.resetSelectionState();
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
    return this.availableResults - this.filteredResults.length;
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

  // Selection methods
  toggleSelection(groupedResult: GroupedResult, event: MouseEvent) {
    event.preventDefault(); // Prevent text selection
    event.stopPropagation(); // Prevent event bubbling

    const resultId = groupedResult.result.searchResultId;
    const currentIndex = this.displayedResults.indexOf(groupedResult);

    if (event.shiftKey && this.lastSelectedIndex !== -1) {
      // Shift-click: select range from last clicked to current
      this.selectRange(this.lastSelectedIndex, currentIndex);
    } else {
      // Single click: toggle selection
      if (this.selectedResultsIds.has(resultId)) {
        this.selectedResultsIds.delete(resultId);
      } else {
        this.selectedResultsIds.add(resultId);
      }
      this.lastSelectedIndex = currentIndex;
    }

    this.updateGroupedResults();
  }

  selectRange(startIndex: number, endIndex: number) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    for (let i = start; i <= end; i++) {
      const groupedResult = this.displayedResults[i];
      if (groupedResult) {
        this.selectedResultsIds.add(groupedResult.result.searchResultId);
      }
    }
  }

  unselectRange(startIndex: number, endIndex: number) {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);

    for (let i = start; i <= end; i++) {
      const groupedResult = this.displayedResults[i];
      if (groupedResult) {
        this.selectedResultsIds.delete(groupedResult.result.searchResultId);
      }
    }
  }

  // Proper shift-click behavior
  toggleSelectionWithUnselect(groupedResult: GroupedResult, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const resultId = groupedResult.result.searchResultId;
    const currentIndex = this.displayedResults.indexOf(groupedResult);

    if (event.shiftKey && this.lastSelectedIndex !== -1 && this.lastSelectionAction) {
      // Shift-click: apply the same action to the range
      if (this.lastSelectionAction === "select") {
        this.selectRange(this.lastSelectedIndex, currentIndex);
      } else {
        this.unselectRange(this.lastSelectedIndex, currentIndex);
      }
    } else {
      // Single click: toggle selection and remember the action
      if (this.selectedResultsIds.has(resultId)) {
        this.selectedResultsIds.delete(resultId);
        this.lastSelectionAction = "unselect";
      } else {
        this.selectedResultsIds.add(resultId);
        this.lastSelectionAction = "select";
      }
      this.lastSelectedIndex = currentIndex;
    }

    this.updateGroupedResults();
  }

  resetSelection() {
    this.selectedResultsIds.clear();
    this.lastSelectedIndex = -1;
    this.lastSelectionAction = null;
    this.updateGroupedResults();
  }

  resetSelectionState() {
    this.lastSelectedIndex = -1;
    this.lastSelectionAction = null;
  }

  toggleIndexerStatuses() {
    this.showIndexerStatuses = !this.showIndexerStatuses;
  }

  closeIndexerStatuses() {
    this.showIndexerStatuses = false;
  }

  selectAll() {
    this.displayedResults.forEach(groupedResult => {
      this.selectedResultsIds.add(groupedResult.result.searchResultId);
    });
    this.updateGroupedResults();
  }

  selectNone() {
    this.selectedResultsIds.clear();
    this.updateGroupedResults();
  }

  invertSelection() {
    this.displayedResults.forEach(groupedResult => {
      const resultId = groupedResult.result.searchResultId;
      if (this.selectedResultsIds.has(resultId)) {
        this.selectedResultsIds.delete(resultId);
      } else {
        this.selectedResultsIds.add(resultId);
      }
    });
    this.updateGroupedResults();
  }

  get selectedCount(): number {
    return this.selectedResultsIds.size;
  }

  get hasSelection(): boolean {
    return this.selectedResultsIds.size > 0;
  }

  getSelectedResults(): SearchResultWebTO[] {
    return this.searchResponse?.searchResults.filter(result =>
        this.selectedResultsIds.has(result.searchResultId)
    ) || [];
  }

  // Make Math available in template
  get Math() {
    return Math;
  }

  // Local storage methods for sort configuration
  private loadSortConfig(): void {
    const savedConfig = this.localStorageService.getItem<SortConfig>("searchResultsSortConfig");
    if (savedConfig) {
      this.sortConfig = savedConfig;
    }
  }

  private saveSortConfig(): void {
    this.localStorageService.setItem("searchResultsSortConfig", this.sortConfig);
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  private loadEnabledDownloaders(): void {
    this.downloaderService.getEnabledDownloaders().subscribe({
      next: (downloaders) => {
        this.enabledDownloaders = downloaders;
        console.log("Enabled downloaders: ", downloaders);
      },
      error: (error) => {
        console.error("Error loading enabled downloaders:", error);
        this.enabledDownloaders = [];
      }
    });
  }

  onDownloadComplete(result: { successful: boolean, message?: string }): void {
    if (!result.successful && result.message) {
      // TODO: Show error message to user (could use a toast service)
      console.error("Download failed:", result.message);
    }
  }

  onSaveComplete(result: { successful: boolean, message?: string }): void {
    if (!result.successful && result.message) {
      // TODO: Show error message to user (could use a toast service)
      console.error("Save failed:", result.message);
    }
  }

  // Link action methods
  showNfo(searchResult: SearchResultWebTO): void {
    // TODO: Implement NFO display modal
    console.log("Show NFO for:", searchResult.title);
  }

  getNfoTooltip(searchResult: SearchResultWebTO): string {
    if (searchResult.hasNfo === "NO") {
      return "No NFO available";
    } else if (searchResult.hasNfo === "MAYBE") {
      return "NFO might be available";
    } else {
      return "Show NFO";
    }
  }

  getBinsearchUrl(source: string): string {
    // TODO: Implement proper binsearch URL generation
    return `https://www.binsearch.info/?q=${encodeURIComponent(source)}`;
  }

  getDerefererUrl(url: string): string {
    // TODO: Implement proper dereferer URL generation
    return url;
  }

  getDownloadUrl(searchResult: SearchResultWebTO): string {
    if (searchResult.downloadType === "TORRENT") {
      return `gettorrent/user/${searchResult.searchResultId}`;
    } else {
      return `getnzb/user/${searchResult.searchResultId}`;
    }
  }
} 