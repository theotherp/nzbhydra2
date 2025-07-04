import {Injectable} from "@angular/core";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {CategoriesConfig, Category, ConfigService} from "./config.service";

@Injectable({
    providedIn: "root"
})
export class CategoriesService {

    constructor(private configService: ConfigService) {
    }

    getCategories(): Observable<CategoriesConfig> {
        return this.configService.getCategoriesConfig();
    }

    getCategoryByName(name: string): Observable<Category | undefined> {
        return this.getCategories().pipe(
            map(config => config.categories.find(cat => cat.name === name))
        );
    }

    getDefaultCategory(): Observable<Category> {
        return this.getCategories().pipe(
            map(config => {
                const defaultCat = config.categories.find(cat => cat.name === config.defaultCategory);
                return defaultCat || config.categories[0];
            })
        );
    }

    getAvailableCategories(): Observable<Category[]> {
        return this.getCategories().pipe(
            map(config => config.categories.filter(cat => cat.mayBeSelected))
        );
    }

    clearCache(): void {
        this.configService.clearCache();
    }
} 