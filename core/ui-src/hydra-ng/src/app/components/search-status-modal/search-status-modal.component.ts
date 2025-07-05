import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges} from "@angular/core";
import {Subscription} from "rxjs";
import {WebSocketService} from "../../services/websocket.service";

export interface SortableMessage {
    message: string;
    messageSortValue: string;
}

export interface SearchState {
    searchRequestId: number;
    indexerSelectionFinished: boolean;
    searchFinished: boolean;
    indexersSelected: number;
    indexersFinished: number;
    messages: SortableMessage[];
}

@Component({
    selector: "app-search-status-modal",
    templateUrl: "./search-status-modal.component.html",
    styleUrls: ["./search-status-modal.component.css"],
    standalone: false
})
export class SearchStatusModalComponent implements OnDestroy, OnInit, OnChanges {
    @Input() isVisible = false;
    @Input() searchRequestId = 0;
    @Output() cancel = new EventEmitter<void>();
    @Output() showResults = new EventEmitter<void>();

    private subscription?: Subscription;

    messages: SortableMessage[] = [];
    indexerSelectionFinished = false;
    indexersSelected = 0;
    indexersFinished = 0;
    searchFinished = false;
    buttonText = "Cancel";
    buttonTooltip = "Cancel search and return to search mask";
    btnType = "btn-danger";

    constructor(private webSocketService: WebSocketService) {
    }

    ngOnInit() {
        // Subscribe to WebSocket updates when component initializes
        this.subscription = this.webSocketService.searchState$.subscribe((state: SearchState) => {
            console.log("Modal received search state update for requestId:", state.searchRequestId, "current requestId:", this.searchRequestId);
            if (state.searchRequestId === this.searchRequestId) {
                console.log("Modal processing search state update:", state);
                this.updateSearchState(state);
            } else {
                console.log("Modal ignoring search state update - requestId mismatch");
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        // When searchRequestId changes, reset the component state
        if (changes["searchRequestId"] && !changes["searchRequestId"].firstChange) {
            console.log("Modal searchRequestId changed to:", this.searchRequestId);
            this.reset();
        }
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    get progressMax(): string {
        return this.indexersSelected.toString();
    }

    get progressValue(): number {
        return this.indexersFinished;
    }

    get hasPartialResults(): boolean {
        return this.indexersFinished > 0;
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onShowResults(): void {
        console.log("User wants to see the results now");
        this.showResults.emit();
    }

    updateSearchState(state: SearchState): void {
        if (state.searchRequestId !== this.searchRequestId) {
            return;
        }
        console.log("Updating modal state:", state);

        this.searchFinished = state.searchFinished;
        this.indexerSelectionFinished = state.indexerSelectionFinished;
        this.indexersSelected = state.indexersSelected;
        this.indexersFinished = state.indexersFinished;

        console.log("Modal state after update - messages.length:", this.messages.length, "indexerSelectionFinished:", this.indexerSelectionFinished);

        if (this.indexersFinished > 0) {
            this.buttonText = "Show results";
            this.buttonTooltip = "Show results that have already been loaded";
            this.btnType = "btn-warning";
        }

        if (state.messages) {
            // Sort messages by messageSortValue
            this.messages = state.messages.sort((a, b) =>
                a.messageSortValue.localeCompare(b.messageSortValue)
            );
            console.log("Messages updated:", this.messages.length, "messages");
        }
        console.log("Search finished: " + this.searchFinished);

        if (this.searchFinished && !this.messages.some(m => m.message === "Finished searching. Preparing results...")) {
            this.messages.push({
                message: "Finished searching. Preparing results...",
                messageSortValue: "Finished searching. Preparing results..."
            });
        }
    }

    hasResults(message: SortableMessage): boolean {
        return /^[^0]\d+.*/.test(message.message);
    }

    reset(): void {
        this.messages = [];
        this.indexerSelectionFinished = false;
        this.indexersSelected = 0;
        this.indexersFinished = 0;
        this.searchFinished = false;
        this.buttonText = "Cancel";
        this.buttonTooltip = "Cancel search and return to search mask";
        this.btnType = "btn-danger";
    }

    // Method to reset state when new search starts
    resetForNewSearch(): void {
        this.reset();
    }
} 