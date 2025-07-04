import {Component, Input} from "@angular/core";
import {SearchResponse} from "../../services/search.service";

@Component({
    selector: "app-search-results",
    templateUrl: "./search-results.component.html",
    styleUrls: ["./search-results.component.css"],
    standalone: false
})
export class SearchResultsComponent {
    @Input() searchResponse?: SearchResponse;
    @Input() isLoading = false;

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
} 