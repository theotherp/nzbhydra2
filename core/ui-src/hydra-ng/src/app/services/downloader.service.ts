import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable, throwError} from "rxjs";
import {catchError, map} from "rxjs/operators";
import {ConfigService} from "./config.service";

export interface Downloader {
    name: string;
    downloaderType: string;
    enabled: boolean;
    defaultCategory?: string;
    iconCssClass?: string;
}

export interface SearchResult {
    searchResultId?: number;
    id?: number;
    originalCategory?: string;
    category?: string;
}

export interface DownloadRequest {
    downloaderName: string;
    searchResults: SearchResult[];
    category: string;
}

export interface DownloadResponse {
    successful: boolean;
    addedIds?: number[];
    message?: string;
}

@Injectable({
    providedIn: "root"
})
export class DownloaderService {
    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) {
    }

    /**
     * Send NZB add command to downloader
     */
    private sendNzbAddCommand(downloader: Downloader, searchResults: SearchResult[], category: string): Observable<DownloadResponse> {
        const params: DownloadRequest = {
            downloaderName: downloader.name,
            searchResults: searchResults,
            category: category
        };

        return this.http.put<DownloadResponse>("internalapi/downloader/addNzbs", params);
    }

    /**
     * Download NZB to specified downloader
     */
    download(downloader: Downloader, searchResults: SearchResult[], alwaysAsk: boolean = false): Observable<DownloadResponse> {
        const category = downloader.defaultCategory;

        // If always ask or no default category, we'll need to show category selection
        if (alwaysAsk || (!category || category === "Use original category" || category === "Use mapped category" || category === "Use no category")) {
            // For now, we'll use the default category and handle category selection in the component
            // TODO: Implement category selection modal
            return this.sendNzbAddCommand(downloader, searchResults, category || "");
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