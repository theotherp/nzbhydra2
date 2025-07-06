import {Component, EventEmitter, Input, Output} from "@angular/core";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {take} from "rxjs/operators";
import {Downloader, DownloaderService, SearchResultDl} from "../../services/downloader.service";
import {SearchResultWebTO} from "../../services/search.service";
import {CategorySelectionModalComponent} from "../category-selection-modal/category-selection-modal.component";


@Component({
    selector: "app-addable-nzb",
    templateUrl: "./addable-nzb.component.html",
    styleUrls: ["./addable-nzb.component.scss"],
    standalone: false
})
export class AddableNzbComponent {
    @Input() searchResult!: SearchResultWebTO;
    @Input() downloader!: Downloader;
    @Input() alwaysAsk: boolean = false;
    @Output() downloadComplete = new EventEmitter<{ successful: boolean, message?: string }>();

    cssClass: string = "";
    isDownloading: boolean = false;

    constructor(
        private downloaderService: DownloaderService,
        private modalService: NgbModal
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
        const originalClass = this.cssClass;
        this.cssClass = "nzb-spinning";

        // If alwaysAsk or no default category, open modal
        if (this.alwaysAsk || !this.downloader.defaultCategory) {
            this.downloaderService.getCategories(this.downloader).pipe(take(1)).subscribe({
                next: (categories) => {
                    const modalRef = this.modalService.open(CategorySelectionModalComponent, {size: "sm"});
                    modalRef.componentInstance.categories = categories;
                    modalRef.result.then((selectedCategory: string) => {
                        this.doDownload(this.searchResult, selectedCategory);
                    }, () => {
                        this.cssClass = originalClass;
                        this.isDownloading = false;
                    });
                },
                error: () => {
                    this.cssClass = this.buildCssClass("-error");
                    this.downloadComplete.emit({
                        successful: false,
                        message: "Failed to load categories from downloader."
                    });
                    this.isDownloading = false;
                }
            });
        } else {
            this.doDownload(this.searchResult, this.downloader.defaultCategory);
        }
    }

    private buildSearchResultDl(searchResult: SearchResultWebTO): SearchResultDl {
        return {
            searchResultId: this.searchResult.searchResultId,
            originalCategory: this.searchResult.originalCategory,
            mappedCategory: this.searchResult.category
        };
    }

    private buildCssClass(postfix: string) {
        let baseClass = this.getCssClass(this.downloader.downloaderType);
        return baseClass + " " + baseClass + postfix;
    }

    private doDownload(searchResult: SearchResultWebTO, category: string) {
        this.downloaderService.download(this.downloader, [this.buildSearchResultDl(searchResult)], category)
            .subscribe({
                next: (response) => {
                    if (
                        response.successful && response.addedIds?.includes(searchResult.searchResultId)
                    ) {
                        this.cssClass = this.buildCssClass("-success");
                        this.downloadComplete.emit({successful: true});
                    } else {
                        this.cssClass = this.buildCssClass("-error");
                        this.downloadComplete.emit({successful: false, message: response.message});
                    }
                    this.isDownloading = false;
                },
                error: () => {
                    this.cssClass = this.buildCssClass("-error");
                    this.downloadComplete.emit({
                        successful: false,
                        message: "An unexpected error occurred while trying to contact NZBHydra or add the NZB."
                    });
                    this.isDownloading = false;
                }
            });
    }
} 