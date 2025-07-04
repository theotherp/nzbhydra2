import {ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {FormBuilder, FormGroup} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {Observable, of} from "rxjs";
import {catchError, debounceTime, distinctUntilChanged, switchMap} from "rxjs/operators";
import {CategoriesService} from "../../services/categories.service";
import {Category} from "../../services/config.service";
import {IndexersService, IndexerWithState} from "../../services/indexers.service";
import {AutocompleteType, MediaInfo, MediaInfoService} from "../../services/media-info.service";
import {SearchRequestParameters, SearchResponse, SearchService} from "../../services/search.service";

@Component({
    selector: "app-search",
    templateUrl: "./search.component.html",
    styleUrls: ["./search.component.css"],
    standalone: false
})
export class SearchComponent implements OnInit {
    @ViewChild("searchInput", {static: false}) searchInput!: ElementRef;
    @ViewChild("queryInput", {static: false}) queryInput!: ElementRef;

    searchForm: FormGroup;
    categories: Category[] = [];
    category: Category | undefined;
    availableIndexers: IndexerWithState[] = [];
    selectedIndexers: string[] = [];
    minsize?: number;
    maxsize?: number;
    minage?: number;
    maxage?: number;
    season?: number;
    episode?: number;
    query: string = "";
    selectedItem: MediaInfo | null = null;
    showIndexerSelection = true;
    showResults = false;
    autocompleteResults: MediaInfo[] = [];
    isAutocompleteLoading = false;
    showAutocomplete = false;
    searchBoxTooltip = "Prefix terms with -- to exclude";
    isAutocompleteEnabled = true; // Default to enabled
    searchResponse?: SearchResponse;
    isSearching = false;
    isInitialLoad = true; // Flag to track initial load

    constructor(
        private fb: FormBuilder,
        private mediaInfoService: MediaInfoService,
        private searchService: SearchService,
        private categoriesService: CategoriesService,
        private indexersService: IndexersService,
        private router: Router,
        private route: ActivatedRoute,
        private cdr: ChangeDetectorRef
    ) {
        this.searchForm = this.fb.group({
            query: [""],
            minsize: [""],
            maxsize: [""],
            minage: [""],
            maxage: [""],
            season: [""],
            episode: [""],
            category: [""],
            indexers: [[]],
            autocomplete: [true] // Enable autocomplete by default
        });
    }

    ngOnInit(): void {
        // Load categories from backend
        this.categoriesService.getAvailableCategories().subscribe(categories => {
            this.categories = categories;
            this.category = this.categories[0];

            // Load indexers for the default category
            this.loadIndexersForCategory(this.category);

            // Set up autocomplete
            this.setupAutocomplete();

            // Load search parameters from URL
            this.loadSearchFromUrl();
        });
    }

    loadIndexersForCategory(category: Category) {
        this.indexersService.getAvailableIndexers(category.name, this.selectedIndexers).subscribe(indexers => {
            this.availableIndexers = indexers;
            this.selectedIndexers = this.indexersService.getSelectedIndexers(indexers);
        });
    }

    ngAfterViewInit() {
        // Set initial focus to search input
        this.setFocusToSearchInput();
    }

    loadSearchFromUrl() {
        this.route.queryParams.subscribe(params => {
            if (Object.keys(params).length > 0) {
                // Populate form from URL parameters
                const formValues: any = {};

                if (params["q"]) {
                    formValues.query = params["q"];
                    this.query = params["q"];
                }
                if (params["category"]) {
                    const categoryName = params["category"];
                    // Wait for categories to be loaded before setting category
                    if (this.categories.length > 0) {
                        this.category = this.categories.find(c => c.name === categoryName) || this.categories[0];
                    } else {
                        this.categoriesService.getCategoryByName(categoryName).subscribe(category => {
                            if (category) {
                                this.category = category;
                            }
                        });
                    }
                }
                if (params["minsize"]) {
                    formValues.minsize = params["minsize"];
                    this.minsize = params["minsize"];
                }
                if (params["maxsize"]) {
                    formValues.maxsize = params["maxsize"];
                    this.maxsize = params["maxsize"];
                }
                if (params["minage"]) {
                    formValues.minage = params["minage"];
                    this.minage = params["minage"];
                }
                if (params["maxage"]) {
                    formValues.maxage = params["maxage"];
                    this.maxage = params["maxage"];
                }
                if (params["season"]) {
                    formValues.season = params["season"];
                    this.season = params["season"];
                }
                if (params["episode"]) {
                    formValues.episode = params["episode"];
                    this.episode = params["episode"];
                }
                if (params["indexers"]) {
                    const indexerNames = params["indexers"].split(",");
                    this.selectedIndexers = indexerNames;
                    this.availableIndexers.forEach(indexer => {
                        indexer.activated = indexerNames.includes(indexer.name);
                    });
                    formValues.indexers = indexerNames;
                }

                // Update form
                this.searchForm.patchValue(formValues);

                // Update search box tooltip
                this.updateSearchBoxTooltip();

                // Only start search if this is the initial load (not from URL updates)
                if (this.isInitialLoad && Object.keys(params).length > 0) {
                    this.performSearch();
                }

                // Mark as no longer initial load
                this.isInitialLoad = false;
            }
        });
    }

    setupAutocomplete() {
        this.searchForm.get("query")?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(value => {
                const autocompleteEnabled = this.searchForm.get("autocomplete")?.value;
                if (!value || value.length < 2 || !this.shouldShowAutocomplete() || !autocompleteEnabled) {
                    this.showAutocomplete = false;
                    return of([]);
                }
                this.isAutocompleteLoading = true;
                this.showAutocomplete = true;
                return this.getAutocompleteResults(value);
            }),
            catchError(error => {
                console.error("Autocomplete error:", error);
                this.isAutocompleteLoading = false;
                return of([]);
            })
        ).subscribe(results => {
            this.autocompleteResults = results;
            this.isAutocompleteLoading = false;
        });
    }

    getAutocompleteResults(input: string): Observable<MediaInfo[]> {
        if (!this.category?.searchType) {
            return of([]);
        }

        const type: AutocompleteType = this.category.searchType === "MOVIE" ? "MOVIE" : "TV";
        return this.mediaInfoService.getAutocomplete(type, input);
    }

    shouldShowAutocomplete(): boolean {
        return this.category?.searchType === "MOVIE" || this.category?.searchType === "TVSEARCH";
    }

    toggleCategory(cat: Category, event?: Event) {
        if (event) {
            event.preventDefault();
        }

        this.category = cat;
        this.selectedItem = null;
        this.showAutocomplete = false;

        // Load indexers for the new category
        this.loadIndexersForCategory(cat);

        // Enable or disable autocomplete checkbox based on category
        if (this.shouldShowAutocomplete()) {
            this.searchForm.get("autocomplete")?.setValue(true);
        } else {
            this.searchForm.get("autocomplete")?.setValue(false);
        }

        // Update search box tooltip
        this.updateSearchBoxTooltip();

        // Set focus to search input after category selection
        setTimeout(() => {
            this.cdr.detectChanges();
            this.setFocusToSearchInput();
        }, 50);

        // Trigger autocomplete if there's a current query and autocomplete is enabled
        const currentQuery = this.searchForm.get("query")?.value;
        if (currentQuery && currentQuery.length >= 2 && this.shouldShowAutocomplete() && this.searchForm.get("autocomplete")?.value) {
            this.isAutocompleteLoading = true;
            this.showAutocomplete = true;
            this.getAutocompleteResults(currentQuery).subscribe(results => {
                this.autocompleteResults = results;
                this.isAutocompleteLoading = false;
            });
        }
    }

    setFocusToSearchInput() {
        if (this.queryInput) {
            this.queryInput.nativeElement.focus();
        }
    }

    updateSearchBoxTooltip() {
        if (!this.shouldShowAutocomplete()) {
            this.searchBoxTooltip = "Prefix terms with -- to exclude";
        } else if (!this.selectedItem) {
            this.searchBoxTooltip = "Enter search terms for autocomplete";
        } else {
            this.searchBoxTooltip = "Enter additional search terms to limit the query";
        }
    }

    initiateSearch() {
        if (this.selectedIndexers.length === 0) {
            // TODO: Show error message
            console.error("You didn't select any indexers");
            return;
        }

        this.performSearch();
    }

    performSearch() {
        this.isSearching = true;
        this.showResults = true;
        this.searchResponse = undefined;

        // Build search parameters
        const searchParams: any = {};

        if (this.searchForm.value.query) {
            searchParams.q = this.searchForm.value.query;
        }
        if (this.category?.name !== "All") {
            searchParams.category = this.category?.name;
        }
        if (this.searchForm.value.minsize) {
            searchParams.minsize = this.searchForm.value.minsize;
        }
        if (this.searchForm.value.maxsize) {
            searchParams.maxsize = this.searchForm.value.maxsize;
        }
        if (this.searchForm.value.minage) {
            searchParams.minage = this.searchForm.value.minage;
        }
        if (this.searchForm.value.maxage) {
            searchParams.maxage = this.searchForm.value.maxage;
        }
        if (this.searchForm.value.season) {
            searchParams.season = this.searchForm.value.season;
        }
        if (this.searchForm.value.episode) {
            searchParams.episode = this.searchForm.value.episode;
        }
        if (this.selectedIndexers.length > 0) {
            searchParams.indexers = this.selectedIndexers.join(",");
        }

        // Update URL with search parameters
        this.router.navigate(["/search"], {queryParams: searchParams});

        // Create search request parameters
        const searchRequestParams: SearchRequestParameters = {
            searchRequestId: Date.now(), // Use timestamp as search request ID
            query: this.searchForm.value.query,
            category: this.category?.name,
            minsize: this.searchForm.value.minsize,
            maxsize: this.searchForm.value.maxsize,
            minage: this.searchForm.value.minage,
            maxage: this.searchForm.value.maxage,
            season: this.searchForm.value.season,
            episode: this.searchForm.value.episode,
            indexers: this.selectedIndexers,
            limit: 100,
            offset: 0
        };

        // Add media identifiers if autocomplete item is selected
        if (this.selectedItem) {
            if (this.selectedItem.imdbId) {
                searchRequestParams.imdbId = this.selectedItem.imdbId;
            }
            if (this.selectedItem.tmdbId) {
                searchRequestParams.tmdbId = this.selectedItem.tmdbId;
            }
            if (this.selectedItem.tvdbId) {
                searchRequestParams.tvdbId = this.selectedItem.tvdbId;
            }
            if (this.selectedItem.tvmazeId) {
                searchRequestParams.tvmazeId = this.selectedItem.tvmazeId;
            }
            if (this.selectedItem.title) {
                searchRequestParams.title = this.selectedItem.title;
            }
        }

        // Call the search service
        this.searchService.search(searchRequestParams).subscribe({
            next: (response) => {
                this.searchResponse = response;
                this.isSearching = false;
            },
            error: (error) => {
                console.error("Search error:", error);
                this.isSearching = false;
                // TODO: Show error message to user
            }
        });
    }

    onKeyPress(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            this.initiateSearch();
        }
    }

    clearQuery() {
        this.query = "";
        this.selectedItem = null;
        this.showAutocomplete = false;
        this.searchForm.patchValue({query: ""});
        this.updateSearchBoxTooltip();
    }

    clearForm() {
        this.searchForm.reset();
        this.query = "";
        this.selectedItem = null;
        this.showAutocomplete = false;
        this.autocompleteResults = [];
        this.categoriesService.getDefaultCategory().subscribe(defaultCategory => {
            this.category = defaultCategory;
        });
        this.setFocusToSearchInput();
    }

    clearAutocomplete() {
        this.selectedItem = null;
        this.query = "";
        this.showAutocomplete = false;
        this.searchForm.patchValue({query: ""});
        this.updateSearchBoxTooltip();
    }

    selectAutocompleteItem(item: MediaInfo, event?: Event) {
        if (event) {
            event.preventDefault();
        }
        this.selectedItem = item;
        this.query = item.title || "";
        this.showAutocomplete = false;
        this.searchForm.patchValue({query: item.title || ""});
        this.updateSearchBoxTooltip();
    }

    onIndexerChange(indexer: IndexerWithState) {
        indexer.activated = !indexer.activated;
        this.selectedIndexers = this.availableIndexers
            .filter(i => i.activated)
            .map(i => i.name);
    }

    isIndexerSelected(indexerName: string): boolean {
        return this.selectedIndexers.includes(indexerName);
    }

    invertIndexerSelection(event?: Event) {
        event?.preventDefault();
        this.availableIndexers.forEach(indexer => {
            indexer.activated = !indexer.activated;
        });
        this.selectedIndexers = this.availableIndexers
            .filter(i => i.activated)
            .map(i => i.name);
    }

    resetIndexerSelection(event?: Event) {
        event?.preventDefault();
        // Reset to original state (all activated indexers)
        this.availableIndexers.forEach(indexer => {
            indexer.activated = indexer.preselect || false; // Use preselect property from backend
        });
        this.selectedIndexers = this.availableIndexers
            .filter(i => i.activated)
            .map(i => i.name);
    }

    selectAllIndexers(event?: Event) {
        event?.preventDefault();
        this.availableIndexers.forEach(indexer => {
            indexer.activated = true;
        });
        this.selectedIndexers = this.availableIndexers.map(i => i.name);
    }

    deselectAllIndexers(event?: Event) {
        event?.preventDefault();
        this.availableIndexers.forEach(indexer => {
            indexer.activated = false;
        });
        this.selectedIndexers = [];
    }

    onAutocompleteFocus() {
        const autocompleteEnabled = this.searchForm.get("autocomplete")?.value;
        if (this.shouldShowAutocomplete() && this.searchForm.get("query")?.value?.length >= 2 && autocompleteEnabled) {
            this.showAutocomplete = true;
        }
    }

    onAutocompleteBlur() {
        // Delay hiding to allow for clicks on autocomplete items
        setTimeout(() => {
            this.showAutocomplete = false;
        }, 200);
    }

    toggleAutocomplete() {
        const currentValue = this.searchForm.get("autocomplete")?.value;
        this.searchForm.get("autocomplete")?.setValue(!currentValue);
        if (!this.searchForm.get("autocomplete")?.value) {
            this.showAutocomplete = false;
            this.selectedItem = null;
        }
    }

    // Add more methods as needed for autocomplete, etc.
} 