import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {Observable, throwError} from "rxjs";
import {catchError, map, switchMap, take} from "rxjs/operators";
import {CategorySelectionModalComponent} from "../components/category-selection-modal/category-selection-modal.component";
import {Downloader, DownloadRequest, DownloadResponse, SearchResultDl} from "../types/config.types";
import {ConfigService} from "./config.service";

// Types are now imported from ../types/config.types

@Injectable({
    providedIn: "root"
})
export class DownloaderService {
    constructor(
        private http: HttpClient,
        private configService: ConfigService,
        private modalService: NgbModal
    ) {
    }

    /**
     * Send NZB add command to downloader
     */
    private sendNzbAddCommand(downloader: Downloader, searchResults: SearchResultDl[], category: string): Observable<DownloadResponse> {
        const params: DownloadRequest = {
            downloaderName: downloader.name,
            searchResults: searchResults,
            category: category
        };

        return this.http.put<DownloadResponse>("internalapi/downloader/addNzbs", params);
    }

    /**
     * Download NZB to specified downloader
     * Opens category selection modal if no default category is set
     */
    download(downloader: Downloader, searchResults: SearchResultDl[]): Observable<DownloadResponse> {
        let category = downloader.defaultCategory;
        if (!category) {
            return this.getCategories(downloader).pipe(
                take(1),
                switchMap(categories => {
                    const modalRef = this.modalService.open(CategorySelectionModalComponent, {size: "sm"});
                    modalRef.componentInstance.categories = categories;

                    return new Observable<DownloadResponse>(observer => {
                        modalRef.result.then((selectedCategory: string) => {
                            this.sendNzbAddCommand(downloader, searchResults, selectedCategory).subscribe({
                                next: (response) => observer.next(response),
                                error: (error) => observer.error(error)
                            });
                        }, () => {
                            observer.error(new Error("Category selection cancelled"));
                        });
                    });
                }),
                catchError(error => {
                    console.error("Error fetching categories:", error);
                    return throwError(() => error);
                })
            );
        } else {
            return this.sendNzbAddCommand(downloader, searchResults, category);
        }
    }

    /**
     * Get all enabled downloaders
     */
    getEnabledDownloaders(): Observable<Downloader[]> {
        return this.configService.getSafeConfig().pipe(
            map(config => {
                if (!config?.downloading?.downloaders) {
                    return [];
                }
                return config.downloading.downloaders.filter((downloader: any) => downloader.enabled);
            })
        );
    }

    /**
     * Get downloader categories
     */
    getCategories(downloader: Downloader): Observable<string[]> {
        return this.http.get<string[]>(`internalapi/downloader/${encodeURIComponent(downloader.name)}/categories`)
            .pipe(
                catchError(error => {
                    console.error("Error fetching categories:", error);
                    return throwError(() => error);
                })
            );
    }
} 