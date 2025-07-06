import {HttpClient} from "@angular/common/http";
import {Component, EventEmitter, Input, Output} from "@angular/core";

export interface SaveOrSendResponse {
    successful: boolean;
    message?: string;
}

@Component({
    selector: "app-save-or-send-file",
    templateUrl: "./save-or-send-file.component.html",
    styleUrls: ["./save-or-send-file.component.scss"],
    standalone: false
})
export class SaveOrSendFileComponent {
    @Input() searchResultId!: string;
    @Input() type!: string;
    @Input() isFile?: boolean;
    @Output() saveComplete = new EventEmitter<{ successful: boolean, message?: string }>();

    cssClass: string = "bi-hdd-network";
    isSaving: boolean = false;
    enableButton: boolean = false;
    tooltip: string = "";

    constructor(private http: HttpClient) {
        this.updateButtonState();
    }

    ngOnChanges(): void {
        this.updateButtonState();
    }

    private updateButtonState(): void {
        // TODO: Get config from ConfigService when available
        if (this.type === "TORRENT") {
            this.tooltip = "Save torrent to black hole or send magnet link";
            this.enableButton = true; // TODO: Check actual config
        } else {
            this.tooltip = "Save NZB to black hole";
            this.enableButton = true; // TODO: Check actual config
        }
    }

    add(): void {
        if (this.isSaving) {
            return;
        }

        this.isSaving = true;
        // Keep the original icon class, spinning will be handled by CSS class binding

        const endpoint = this.type === "TORRENT"
            ? "internalapi/saveOrSendTorrents"
            : "internalapi/saveNzbsToBlackhole";

        this.http.put<SaveOrSendResponse>(endpoint, [this.searchResultId])
            .subscribe({
                next: (response) => {
                    if (response.successful) {
                        this.cssClass = "bi-check-circle";
                        this.saveComplete.emit({successful: true});
                    } else {
                        this.cssClass = "bi-x-circle";
                        this.saveComplete.emit({
                            successful: false,
                            message: response.message
                        });
                    }
                    this.isSaving = false;
                },
                error: (error) => {
                    this.cssClass = "bi-x-circle";
                    this.saveComplete.emit({
                        successful: false,
                        message: "An unexpected error occurred while saving the file."
                    });
                    this.isSaving = false;
                }
            });
    }
} 