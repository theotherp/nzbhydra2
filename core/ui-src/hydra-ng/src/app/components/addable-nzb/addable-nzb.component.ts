import {Component, EventEmitter, Input, Output} from "@angular/core";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {take} from "rxjs/operators";
import {Downloader, DownloaderService, SearchResult} from "../../services/downloader.service";
import {CategorySelectionModalComponent} from "../category-selection-modal/category-selection-modal.component";

export type SearchResultLike = SearchResult & { searchResultId?: string | number, id?: string | number };

@Component({
    selector: "app-addable-nzb",
    templateUrl: "./addable-nzb.component.html",
    styleUrls: ["./addable-nzb.component.scss"],
    standalone: false
})
export class AddableNzbComponent {
    @Input() searchResult: any;
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

        const id = this.searchResult.searchResultId || this.searchResult.id;
        const baseSearchResult = {
            searchResultId: typeof id === "string" ? Number(id) : id,
            originalCategory: this.searchResult.originalCategory,
            mappedCategory: this.searchResult.category
        };

        // If alwaysAsk or no default category, open modal
        if (this.alwaysAsk || !this.downloader.defaultCategory) {
            this.downloaderService.getCategories(this.downloader).pipe(take(1)).subscribe({
                next: (categories) => {
                    const modalRef = this.modalService.open(CategorySelectionModalComponent, {size: "sm"});
                    modalRef.componentInstance.categories = categories;
                    modalRef.result.then((selectedCategory: string) => {
                        this.doDownload([baseSearchResult], selectedCategory);
                    }, () => {
                        this.cssClass = originalClass;
                        this.isDownloading = false;
                    });
                },
                error: () => {
                    this.cssClass = this.getCssClass(this.downloader.downloaderType) + "-error";
                    this.downloadComplete.emit({
                        successful: false,
                        message: "Failed to load categories from downloader."
                    });
                    this.isDownloading = false;
                }
            });
        } else {
            this.doDownload([baseSearchResult], this.downloader.defaultCategory);
        }
    }

    private doDownload(searchResults: any[], category: string) {
        this.downloaderService.download(this.downloader, searchResults.map(r => ({...r, category})), false)
            .subscribe({
                next: (response) => {
                    const id = searchResults[0].searchResultId;
                    const resultId = typeof id === "string" ? Number(id) : id;
                    if (
                        typeof resultId === "number" &&
                        response.successful &&
                        response.addedIds?.includes(resultId)
                    ) {
                        this.cssClass = this.getCssClass(this.downloader.downloaderType) + "-success";
                        this.downloadComplete.emit({successful: true});
                    } else {
                        this.cssClass = this.getCssClass(this.downloader.downloaderType) + "-error";
                        this.downloadComplete.emit({successful: false, message: response.message});
                    }
                    this.isDownloading = false;
                },
                error: (error) => {
                    this.cssClass = this.getCssClass(this.downloader.downloaderType) + "-error";
                    this.downloadComplete.emit({
                        successful: false,
                        message: "An unexpected error occurred while trying to contact NZBHydra or add the NZB."
                    });
                    this.isDownloading = false;
                }
            });
    }
} 