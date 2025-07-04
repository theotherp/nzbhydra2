import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";

export interface MediaInfo {
    imdbId?: string;
    tmdbId?: string;
    tvmazeId?: string;
    tvrageId?: string;
    tvdbId?: string;
    title?: string;
    year?: number;
    posterUrl?: string;
    label?: string; // For display in autocomplete
}

export type AutocompleteType = "TV" | "MOVIE";

@Injectable({
    providedIn: "root"
})
export class MediaInfoService {
    private baseUrl = "http://127.0.0.1:5076";

    constructor(private http: HttpClient) {
    }

    getAutocomplete(type: AutocompleteType, input: string): Observable<MediaInfo[]> {
        const url = `${this.baseUrl}/internalapi/autocomplete/${type}`;
        return this.http.get<MediaInfo[]>(url, {params: {input}});
    }
} 