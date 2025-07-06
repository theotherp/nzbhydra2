import {Component, EventEmitter, Input, Output} from "@angular/core";
import {Downloader, DownloaderService} from "../../services/downloader.service";
import {SearchResultWebTO} from "../../services/search.service";


@Component({
    selector: "app-addable-nzb",
    templateUrl: "./addable-nzb.component.html",
    styleUrls: ["./addable-nzb.component.scss"],
    standalone: false
})
export class AddableNzbComponent {
    @Input() searchResult!: SearchResultWebTO;
    @Input() downloader!: Downloader;
    @Output() downloadComplete = new EventEmitter<{ successful: boolean, message?: string }>();

    cssClass: string = "";
    isDownloading: boolean = false;

    constructor(
        private downloaderService: DownloaderService
    ) {
        this.updateCssClass();
    }

    ngOnChanges(): void {
        this.updateCssClass();
    }

    private updateCssClass(): void {
        if (this.downloader?.iconCssClass) {
            this.cssClass = "fa fa-" + this.downloader.iconCssClass.replace("fa-", "").replace("fa ", "");
        } else {
            this.cssClass = this.getCssClass(this.downloader?.downloaderType);
        }
    }

    private getCssClass(downloaderType?: string): string {
        if (downloaderType === "SABNZBD") {
            return "sabnzbd";
        } else if (downloaderType === "TORBOX") {
            return "torbox";
        } else {
            return "nzbget";
        }
    }

    add(): void {
        if (this.isDownloading) {
            return;
        }

        this.isDownloading = true;
        this.cssClass = "nzb-spinning";

        this.doDownload();
    }
    private buildCssClass(postfix: string) {
        let baseClass = this.getCssClass(this.downloader.downloaderType);
        return baseClass + " " + baseClass + postfix;
    }

    private doDownload() {
        const searchResultDl = {
            searchResultId: this.searchResult.searchResultId,
            originalCategory: this.searchResult.originalCategory,
            mappedCategory: this.searchResult.category
        };
        this.downloaderService.download(this.downloader, [searchResultDl])
            .subscribe({
                next: (response) => {
                    if (
                        response.successful && response.addedIds?.includes(searchResultDl.searchResultId)
                    ) {
                        this.cssClass = this.buildCssClass("-success");
                        this.downloadComplete.emit({successful: true});
                    } else {
                        this.cssClass = this.buildCssClass("-error");
                        this.downloadComplete.emit({successful: false, message: response.message});
                    }
                    this.isDownloading = false;
                },
                error: (error) => {
                    this.cssClass = this.buildCssClass("-error");
                    if (error.message === "Category selection cancelled") {
                        this.cssClass = this.getCssClass(this.downloader.downloaderType);
                        this.downloadComplete.emit({
                            successful: false,
                            message: "Download cancelled by user."
                        });
                    } else {
                        this.downloadComplete.emit({
                            successful: false,
                            message: "An unexpected error occurred while trying to contact NZBHydra or add the NZB."
                        });
                    }
                    this.isDownloading = false;
                }
            });
    }
} 