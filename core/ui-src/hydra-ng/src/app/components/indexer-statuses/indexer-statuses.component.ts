import {Component, EventEmitter, Input, Output} from "@angular/core";
import {IndexerSearchMetaData} from "../../services/search.service";

export interface NotPickedIndexer {
    indexer: string;
    reason: string;
}

@Component({
    selector: "app-indexer-statuses",
    templateUrl: "./indexer-statuses.component.html",
    styleUrls: ["./indexer-statuses.component.css"],
    standalone: false
})
export class IndexerStatusesComponent {
    @Input() indexerSearchMetaDatas: IndexerSearchMetaData[] = [];
    @Input() notPickedIndexersWithReason: { [key: string]: string } = {};
    @Input() rejectedReasonsMap: { [key: string]: number } = {};
    @Input() isVisible = false;
    @Output() close = new EventEmitter<void>();

    get notPickedIndexers(): NotPickedIndexer[] {
        return Object.entries(this.notPickedIndexersWithReason).map(([indexer, reason]) => ({
            indexer,
            reason
        }));
    }

    get rejectedReasons(): { reason: string; count: number }[] {
        return Object.entries(this.rejectedReasonsMap).map(([reason, count]) => ({
            reason,
            count
        }));
    }

    get hasRejectedResults(): boolean {
        return Object.keys(this.rejectedReasonsMap).length > 0;
    }

    get hasErrors(): boolean {
        return this.indexerSearchMetaDatas.some(indexer => !indexer.wasSuccessful);
    }

    get successfulIndexers(): IndexerSearchMetaData[] {
        return this.indexerSearchMetaDatas.filter(indexer => indexer.wasSuccessful);
    }

    get failedIndexers(): IndexerSearchMetaData[] {
        return this.indexerSearchMetaDatas.filter(indexer => !indexer.wasSuccessful);
    }

    get didNotSearchIndexers(): IndexerSearchMetaData[] {
        return this.indexerSearchMetaDatas.filter(indexer => !indexer.didSearch);
    }

    onClose(): void {
        this.close.emit();
    }

    onBackdropClick(event: Event): void {
        if (event.target === event.currentTarget) {
            this.onClose();
        }
    }

    formatResponseTime(time: number): string {
        return `${time}ms`;
    }

    getStatusIcon(indexer: IndexerSearchMetaData): string {
        if (!indexer.didSearch) {
            return "bi-dash-circle";
        }
        return indexer.wasSuccessful ? "bi-check-circle" : "bi-x-circle";
    }

    getStatusClass(indexer: IndexerSearchMetaData): string {
        if (!indexer.didSearch) {
            return "text-muted";
        }
        return indexer.wasSuccessful ? "text-success" : "text-danger";
    }

    getStatusText(indexer: IndexerSearchMetaData): string {
        if (!indexer.didSearch) {
            return "Did not search";
        }
        return indexer.wasSuccessful ? "Success" : "Failed";
    }
} 