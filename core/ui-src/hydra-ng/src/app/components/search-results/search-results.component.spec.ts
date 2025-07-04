import {CommonModule} from "@angular/common";
import {ComponentFixture, TestBed} from "@angular/core/testing";
import {FormsModule} from "@angular/forms";
import {SearchResponse, SearchResultWebTO} from "../../services/search.service";
import {SearchResultsComponent} from "./search-results.component";

describe("SearchResultsComponent", () => {
    let component: SearchResultsComponent;
    let fixture: ComponentFixture<SearchResultsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule, FormsModule],
            declarations: [SearchResultsComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SearchResultsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });

    describe("Grouping Logic", () => {
        it("should group results by title", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie A", "indexer2", "hash2"),
                createResult("Movie B", "indexer1", "hash3")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            expect(component.titleGroups.length).toBe(2);
            expect(component.titleGroups[0].title).toBe("Movie A");
            expect(component.titleGroups[1].title).toBe("Movie B");
        });

        it("should group duplicate results by hash within title groups", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie A", "indexer2", "hash1"), // Same hash, different indexer
                createResult("Movie A", "indexer3", "hash2")  // Different hash
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            const titleGroup = component.titleGroups[0];
            expect(titleGroup.hashGroups.length).toBe(2);
            expect(titleGroup.hashGroups[0].hash).toBe("hash1");
            expect(titleGroup.hashGroups[0].results.length).toBe(2);
            expect(titleGroup.hashGroups[1].hash).toBe("hash2");
            expect(titleGroup.hashGroups[1].results.length).toBe(1);
        });

        it("should normalize titles for grouping", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A 1080p HDTV", "indexer1", "hash1"),
                createResult("Movie A 720p WEB-DL", "indexer2", "hash2"),
                createResult("Movie B (2023)", "indexer1", "hash3")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            // Debug: log the grouping strings
            console.log("Title groups:", component.titleGroups.map(tg => ({
                title: tg.title,
                groupingString: tg.groupingString,
                resultsCount: tg.results.length
            })));

            // Should group the first two as they have the same normalized title
            expect(component.titleGroups.length).toBe(2);
            expect(component.titleGroups[0].results.length).toBe(2);
            expect(component.titleGroups[1].results.length).toBe(1);
        });
    });

    describe("Sorting Logic", () => {
        it("should sort hash groups by indexer score when sorting by title", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "binsearch", "hash1", 50), // Lower score
                createResult("Movie A", "nzbgeek", "hash1", 100),  // Higher score
                createResult("Movie A", "dognzb", "hash2", 90)     // Medium score
            ];

            component.searchResponse = createSearchResponse(results);
            component.sortConfig = {column: "title", direction: "asc"};
            component.updateResults();

            const titleGroup = component.titleGroups[0];
            // First hash group should be the one with highest indexer score
            expect(titleGroup.hashGroups[0].primaryResult.indexer).toBe("nzbgeek");
            expect(titleGroup.hashGroups[1].primaryResult.indexer).toBe("dognzb");
        });

        it("should sort hash groups by age when indexer scores are equal", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1", 50, 10), // Older
                createResult("Movie A", "indexer2", "hash1", 50, 2),  // Newer
                createResult("Movie A", "indexer3", "hash2", 50, 5)   // Medium
            ];

            component.searchResponse = createSearchResponse(results);
            component.sortConfig = {column: "title", direction: "asc"};
            component.updateResults();

            // Debug: log the hash groups and their primary results
            console.log("Hash groups:", component.titleGroups[0].hashGroups.map(hg => ({
                hash: hg.hash,
                primaryResult: {
                    indexer: hg.primaryResult.indexer,
                    age: hg.primaryResult.age
                }
            })));

            const titleGroup = component.titleGroups[0];
            // First hash group should be the one with newest result
            expect(titleGroup.hashGroups[0].primaryResult.age).toBe(2);
        });

        it("should sort by selected predicate for non-title sorting", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1", 50, 10, 1000), // 1GB
                createResult("Movie B", "indexer2", "hash2", 50, 5, 2000),  // 2GB
                createResult("Movie C", "indexer3", "hash3", 50, 1, 500)    // 500MB
            ];

            component.searchResponse = createSearchResponse(results);
            component.sortConfig = {column: "size", direction: "desc"};
            component.updateResults();

            // Should be sorted by size descending
            expect(component.titleGroups[0].primaryResult.size).toBe(2000);
            expect(component.titleGroups[1].primaryResult.size).toBe(1000);
            expect(component.titleGroups[2].primaryResult.size).toBe(500);
        });
    });

    describe("Filtering Logic", () => {
        it("should filter by indexer", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie B", "indexer2", "hash2"),
                createResult("Movie C", "indexer1", "hash3")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();
            component.updateIndexerFilter(["indexer1"]);

            expect(component.filteredResults.length).toBe(2);
            expect(component.filteredResults.every(r => r.indexer === "indexer1")).toBe(true);
        });

        it("should filter by title", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie B", "indexer2", "hash2"),
                createResult("Movie A Extended", "indexer3", "hash3")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();
            component.updateTitleFilter("Movie A");

            expect(component.filteredResults.length).toBe(2);
            expect(component.filteredResults.every(r => r.title?.includes("Movie A"))).toBe(true);
        });

        it("should filter by size range", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1", 50, 10, 1024 * 1024), // 1MB
                createResult("Movie B", "indexer2", "hash2", 50, 5, 2 * 1024 * 1024), // 2MB
                createResult("Movie C", "indexer3", "hash3", 50, 1, 500 * 1024 * 1024) // 500MB
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            // Debug: log original results and sizes
            console.log("Original results:", results.map(r => ({
                title: r.title,
                size: r.size,
                sizeMB: r.size / (1024 * 1024)
            })));

            component.updateSizeFilter(1, 2); // 1MB to 2MB (size is in MB)

            // Debug: log filtered results
            console.log("Filtered results:", component.filteredResults.map(r => ({
                title: r.title,
                size: r.size,
                sizeMB: r.size / (1024 * 1024)
            })));
            console.log("Filter config:", component.filterConfig);

            expect(component.filteredResults.length).toBe(2);
            expect(component.filteredResults.every(r => {
                const sizeMB = r.size / (1024 * 1024);
                return sizeMB >= 1 && sizeMB <= 2;
            })).toBe(true);
        });
    });

    describe("Expand/Collapse Logic", () => {
        it("should show only primary results when collapsed", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie A", "indexer2", "hash1"), // Same hash
                createResult("Movie B", "indexer1", "hash2")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            // Should show only 2 results (one from each title group)
            expect(component.groupedResults.length).toBe(2);
        });

        it("should show all results when expanded", () => {
            const results: SearchResultWebTO[] = [
                createResult("Movie A", "indexer1", "hash1"),
                createResult("Movie A", "indexer2", "hash1"), // Same hash
                createResult("Movie B", "indexer1", "hash2")
            ];

            component.searchResponse = createSearchResponse(results);
            component.updateResults();

            // Debug: log the structure
            console.log("Title groups before expansion:", component.titleGroups.map(tg => ({
                title: tg.title,
                hashGroups: tg.hashGroups.length,
                isExpanded: tg.isExpanded
            })));

            // Expand the first title group
            component.titleGroups[0].isExpanded = true;
            component.updateGroupedResults();

            // Debug: log the grouped results
            console.log("Grouped results after expansion:", component.groupedResults.length);

            // Should show all hash groups when title group is expanded (2 hash groups = 2 results)
            expect(component.groupedResults.length).toBe(2);
        });
    });

    describe("Pagination", () => {
        it("should handle pagination with grouped results", () => {
            const results: SearchResultWebTO[] = [];
            // Create 15 results (5 title groups with 3 results each)
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    results.push(createResult(`Movie ${i}`, `indexer${j}`, `hash${i}${j}`));
                }
            }

            component.searchResponse = createSearchResponse(results);
            component.pageSize = 3;
            component.updateResults();

            // Debug: log the structure
            console.log("Total grouped results:", component.groupedResults.length);
            console.log("Displayed results:", component.displayedResults.length);
            console.log("Total pages:", component.totalPages);

            // First page should have 3 grouped results (one from each title group)
            expect(component.displayedResults.length).toBe(3);
            expect(component.totalPages).toBe(2); // 5 title groups / 3 per page = 2 pages
        });
    });
});

// Helper functions to create test data
function createResult(
    title: string,
    indexer: string,
    hash: string,
    indexerscore: number = 0,
    age: number = 0,
    size: number = 1000
): SearchResultWebTO {
    return {
        searchResultId: `id-${title}-${indexer}`,
        title,
        link: `http://example.com/${hash}`,
        guid: hash,
        detailsLink: `http://example.com/details/${hash}`,
        publishDate: new Date().toISOString(),
        category: "Movies",
        size,
        files: 1,
        grabs: 0,
        comments: 0,
        password: false,
        usenetDate: new Date().toISOString(),
        age,
        indexer,
        downloadType: "nzb",
        downloadUrl: `http://example.com/download/${hash}`,
        nzbDownloadUrl: `http://example.com/nzb/${hash}`,
        torrentDownloadUrl: "",
        indexerscore,
        hash
    } as SearchResultWebTO;
}

function createSearchResponse(results: SearchResultWebTO[]): SearchResponse {
    return {
        indexerSearchMetaDatas: [],
        rejectedReasonsMap: {},
        notPickedIndexersWithReason: {},
        searchResults: results,
        numberOfAvailableResults: results.length,
        numberOfAcceptedResults: results.length,
        numberOfRejectedResults: 0,
        numberOfProcessedResults: results.length,
        numberOfDuplicateResults: 0,
        offset: 0,
        limit: 100
    };
} 