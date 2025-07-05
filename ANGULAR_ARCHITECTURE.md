# NZBHydra2 Angular Architecture - Common Services, Components & Styles

This document defines the architecture and common elements of the Angular 17+ codebase. It serves as a reference to ensure consistency and avoid duplication when implementing new features or migrating from AngularJS.

## Table of Contents

1. [Core Services](#core-services)
2. [Data Models & Interfaces](#data-models--interfaces)
3. [Common Components](#common-components)
4. [Shared Utilities](#shared-utilities)
5. [Styling Guidelines](#styling-guidelines)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [Authentication & Security](#authentication--security)
9. [Configuration Management](#configuration-management)
10. [Testing Guidelines](#testing-guidelines)

## Core Services

### Configuration Service (`config.service.ts`)

**Purpose**: Centralized configuration management
**Key Features**:

- Safe configuration retrieval with caching
- Category configuration management
- Indexer configuration access
- Configuration cache management

**Usage**:

```typescript
// Inject in components/services
constructor(private
configService: ConfigService
)
{
}

// Get safe configuration
this.configService.getSafeConfig().subscribe(config => {
    // Use configuration
});

// Get categories
this.configService.getCategoriesConfig().subscribe(categories => {
    // Use categories
});

// Get indexers
this.configService.getIndexers().subscribe(indexers => {
    // Use indexers
});
```

**Interfaces**:

- `SafeConfig`: Main configuration interface
- `CategoriesConfig`: Category configuration
- `Category`: Individual category definition

### Local Storage Service (`local-storage.service.ts`)

**Purpose**: Persistent data storage management
**Key Features**:

- Type-safe storage operations
- Error handling for storage failures
- Default value support
- Storage existence checking

**Usage**:

```typescript
// Save data
this.localStorageService.setItem('key', value);

// Retrieve data with type safety
const value = this.localStorageService.getItem<string>('key', 'default');

// Check if key exists
if (this.localStorageService.hasItem('key')) {
    // Key exists
}

// Remove item
this.localStorageService.removeItem('key');

// Clear all storage
this.localStorageService.clear();
```

### Search Service (`search.service.ts`)

**Purpose**: Search functionality management
**Key Features**:

- Search request handling
- Search response processing
- Shortcut search support
- Search parameter management

**Usage**:

```typescript
// Perform search
const searchParams: SearchRequestParameters = {
    query: 'search term',
    category: 'TV',
    searchRequestId: 1
};

this.searchService.search(searchParams).subscribe(response => {
    // Handle search results
});

// Shortcut search
this.searchService.shortcutSearch(searchRequestId).subscribe(() => {
    // Handle shortcut search
});
```

**Interfaces**:

- `SearchRequestParameters`: Search request configuration
- `SearchResponse`: Search response data
- `IndexerSearchMetaData`: Indexer search metadata
- `SearchResultWebTO`: Individual search result

### Categories Service (`categories.service.ts`)

**Purpose**: Category management and filtering
**Key Features**:

- Category retrieval and filtering
- Default category management
- Available categories filtering
- Category cache management

**Usage**:

```typescript
// Get all categories
this.categoriesService.getCategories().subscribe(categories => {
    // Use categories
});

// Get category by name
this.categoriesService.getCategoryByName('TV').subscribe(category => {
    // Use specific category
});

// Get default category
this.categoriesService.getDefaultCategory().subscribe(defaultCategory => {
    // Use default category
});

// Get available categories
this.categoriesService.getAvailableCategories().subscribe(availableCategories => {
    // Use available categories
});
```

### Indexers Service (`indexers.service.ts`)

**Purpose**: Indexer management and filtering
**Key Features**:

- Indexer retrieval and filtering
- Category-based indexer filtering
- Indexer state management
- Preselection logic

**Usage**:

```typescript
// Get all indexers
this.indexersService.getIndexers().subscribe(indexers => {
    // Use indexers
});

// Get available indexers for category
this.indexersService.getAvailableIndexers('TV', previouslySelected).subscribe(indexers => {
    // Use filtered indexers
});

// Get selected indexers
const selectedIndexers = this.indexersService.getSelectedIndexers(indexersWithState);
```

**Interfaces**:

- `Indexer`: Basic indexer definition
- `IndexerWithState`: Indexer with activation state

### Media Info Service (`media-info.service.ts`)

**Purpose**: Media information and autocomplete
**Key Features**:

- Autocomplete functionality
- Media information retrieval
- External database integration

**Usage**:

```typescript
// Get autocomplete results
this.mediaInfoService.getAutocomplete('TV', 'search term').subscribe(results => {
    // Handle autocomplete results
});

// Get movie autocomplete
this.mediaInfoService.getAutocomplete('MOVIE', 'movie title').subscribe(results => {
    // Handle movie results
});
```

**Interfaces**:

- `MediaInfo`: Media information structure
- `AutocompleteType`: Type of autocomplete (TV/MOVIE)

## Data Models & Interfaces

### Search-Related Interfaces

```typescript
// Search request parameters
interface SearchRequestParameters {
    query?: string;
    offset?: number;
    limit?: number;
    minsize?: number;
    maxsize?: number;
    minage?: number;
    maxage?: number;
    loadAll?: boolean;
    category?: string;
    mode?: string;
    indexers?: string[];
    title?: string;
    imdbId?: string;
    tmdbId?: string;
    tvrageId?: string;
    tvdbId?: string;
    tvmazeId?: string;
    season?: number;
    episode?: string;
    searchRequestId: number;
}

// Search response
interface SearchResponse {
    indexerSearchMetaDatas: IndexerSearchMetaData[];
    rejectedReasonsMap: { [key: string]: number };
    notPickedIndexersWithReason: { [key: string]: string };
    searchResults: SearchResultWebTO[];
    numberOfAvailableResults: number;
    numberOfAcceptedResults: number;
    numberOfRejectedResults: number;
    numberOfProcessedResults: number;
    numberOfDuplicateResults: number;
    offset: number;
    limit: number;
}

// Search result
interface SearchResultWebTO {
    searchResultId: string;
    title: string;
    link: string;
    guid: string;
    hash: string;
    detailsLink: string;
    publishDate: string;
    category: string;
    size: number;
    files: number;
    grabs: number;
    comments: number;
    password: boolean;
    usenetDate: string;
    age: number;
    indexer: string;
    downloadType: string;
    downloadUrl: string;
    nzbDownloadUrl: string;
    torrentDownloadUrl: string;
}
```

### Configuration Interfaces

```typescript
// Safe configuration
interface SafeConfig {
    categoriesConfig: CategoriesConfig;
    authType: string;
    dereferer: string;
    searching: any;
    downloading: any;
    logging: any;
    notificationConfig: any;
    emby: any;
    showNews: boolean;
    keepHistory: boolean;
    indexers: any[];
}

// Categories configuration
interface CategoriesConfig {
    enableCategorySizes: boolean;
    categories: Category[];
    defaultCategory: string;
}

// Category definition
interface Category {
    name: string;
    searchType?: string;
    minSizePreset?: number;
    maxSizePreset?: number;
    mayBeSelected: boolean;
    ignoreResultsFrom: string;
    preselect: boolean;
}
```

### Media Information Interfaces

```typescript
// Media information
interface MediaInfo {
    imdbId?: string;
    tmdbId?: string;
    tvmazeId?: string;
    tvrageId?: string;
    tvdbId?: string;
    title?: string;
    year?: number;
    posterUrl?: string;
    label?: string;
}

// Autocomplete type
type AutocompleteType = "TV" | "MOVIE";
```

## Common Components

### Search Results Component (`search-results.component.ts`)

**Purpose**: Display and manage search results
**Key Features**:

- Result filtering and sorting
- Pagination
- Result grouping
- Download functionality
- Status indicators

**Usage**:

```typescript
// In template
<app-search - results
    [searchResponse] = "searchResponse"
    [isLoading] = "isSearching" >
    </app-search-results>
```

**Key Methods**:

- `updateResults()`: Update displayed results
- `applyFiltersAndSorting()`: Apply filters and sorting
- `groupResults()`: Group results by title/hash
- `toggleTitleGroupExpansion()`: Expand/collapse title groups
- `sortBy()`: Sort results by column

**Interfaces**:

- `SortConfig`: Sorting configuration
- `FilterConfig`: Filtering configuration
- `TitleGroup`: Grouped results by title
- `HashGroup`: Grouped results by hash
- `GroupedResult`: Final grouped result structure

## Shared Utilities

### Formatting Utilities

```typescript
// Size formatting
formatSize(bytes
:
number
):
string
{
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Age formatting
formatAge(age
:
number
):
string
{
    if (age < 1) return '< 1 day';
    if (age === 1) return '1 day';
    return `${age} days`;
}

// Date formatting
formatDate(date
:
string | number
):
string
{
    return new Date(date).toLocaleDateString();
}
```

### Validation Utilities

```typescript
// Number validation
isValidNumber(value
:
any
):
boolean
{
    return !isNaN(value) && isFinite(value);
}

// Required field validation
isRequired(value
:
any
):
boolean
{
    return value !== null && value !== undefined && value !== '';
}

// Range validation
isValidRange(min
:
number, max
:
number
):
boolean
{
    return min <= max;
}
```

### Array Utilities

```typescript
// Remove duplicates
removeDuplicates<T>(array
:
T[], key ? : keyof
T
):
T[]
{
    if (key) {
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }
    return [...new Set(array)];
}

// Group by property
groupBy<T>(array
:
T[], key
:
keyof
T
):
{
    [key
:
    string
]:
    T[]
}
{
    return array.reduce((groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {} as { [key: string]: T[] });
}
```

## Styling Guidelines

### Global Styles (`styles.css`)

**Bootstrap Integration**:

```css
@import 'bootstrap/dist/css/bootstrap.min.css';
@import 'bootstrap-icons/font/bootstrap-icons.css';
```

**Typography**:

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}
```

**Navigation Styling**:

```css
.navbar {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-tabs .nav-link {
    border: none;
    border-bottom: 2px solid transparent;
    color: #6c757d;
}

.nav-tabs .nav-link.active {
    border-bottom: 2px solid #007bff;
    color: #007bff;
    background: none;
}
```

### Component-Specific Styles

**Search Results Styling**:

- Result grouping visual hierarchy
- Status indicator colors
- Download button styling
- Filter panel layout

**Form Styling**:

- Consistent input styling
- Validation state indicators
- Button grouping
- Responsive form layout

## State Management

### Service-Based State

**Configuration State**:

- Use `ConfigService` for configuration state
- Cache configuration data
- Provide reactive updates

**Search State**:

- Use `SearchService` for search state
- Maintain search parameters
- Handle search history

**User Preferences**:

- Use `LocalStorageService` for persistent preferences
- Store user settings
- Maintain UI state

### Component State

**Local Component State**:

- Use component properties for local state
- Use `@Input()` and `@Output()` for parent-child communication
- Use `OnPush` change detection for performance

**Form State**:

- Use Reactive Forms for form state
- Use FormBuilder for complex forms
- Implement form validation

## Error Handling

### Service Error Handling

```typescript
// HTTP error handling
import {catchError} from 'rxjs/operators';
import {throwError} from 'rxjs';

this.http.get('/api/data').pipe(
    catchError(error => {
        console.error('API Error:', error);
        return throwError(() => error);
    })
).subscribe({
    next: data => {
        // Handle success
    },
    error: error => {
        // Handle error
    }
});
```

### Component Error Handling

```typescript
// Component error handling
export class MyComponent {
    error: string | null = null;
    isLoading = false;

    loadData() {
        this.isLoading = true;
        this.error = null;

        this.dataService.getData().subscribe({
            next: data => {
                this.data = data;
                this.isLoading = false;
            },
            error: error => {
                this.error = 'Failed to load data';
                this.isLoading = false;
            }
        });
    }
}
```

## Authentication & Security

### Authentication Service (To Be Implemented)

**Purpose**: Handle user authentication and authorization
**Key Features**:

- Login/logout functionality
- Session management
- Role-based access control
- Token management

**Usage**:

```typescript
// Login
this.authService.login(credentials).subscribe({
    next: user => {
        // Handle successful login
    },
    error: error => {
        // Handle login error
    }
});

// Check authentication
if (this.authService.isAuthenticated()) {
    // User is authenticated
}

// Get user role
const role = this.authService.getUserRole();
```

### Route Guards

```typescript
// Authentication guard
@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {
    }

    canActivate(): boolean {
        if (this.authService.isAuthenticated()) {
            return true;
        }
        this.router.navigate(['/login']);
        return false;
    }
}
```

## Configuration Management

### Environment Configuration

```typescript
// environment.ts
export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080',
    version: '1.0.0'
};

// environment.prod.ts
export const environment = {
    production: true,
    apiUrl: 'https://api.nzbhydra2.com',
    version: '1.0.0'
};
```

### Feature Flags

```typescript
// Feature configuration
interface FeatureConfig {
    enableAdvancedSearch: boolean;
    enableAutocomplete: boolean;
    enableIndexerSelection: boolean;
    enableDownloadHistory: boolean;
}
```

## Testing Guidelines

### Service Testing

```typescript
// Service test example
describe('ConfigService', () => {
    let service: ConfigService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ConfigService]
        });
        service = TestBed.inject(ConfigService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    it('should retrieve safe config', () => {
        const mockConfig: SafeConfig = { /* mock data */};

        service.getSafeConfig().subscribe(config => {
            expect(config).toEqual(mockConfig);
        });

        const req = httpMock.expectOne('internalapi/config/safe');
        expect(req.request.method).toBe('GET');
        req.flush(mockConfig);
    });
});
```

### Component Testing

```typescript
// Component test example
describe('SearchComponent', () => {
    let component: SearchComponent;
    let fixture: ComponentFixture<SearchComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [SearchComponent],
            imports: [ReactiveFormsModule, HttpClientTestingModule],
            providers: [
                {provide: SearchService, useClass: MockSearchService},
                {provide: ConfigService, useClass: MockConfigService}
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
```

## Migration Checklist

### When Adding New Features

- [ ] Check if similar functionality exists in existing services
- [ ] Use existing interfaces and data models
- [ ] Follow established naming conventions
- [ ] Implement proper error handling
- [ ] Add comprehensive tests
- [ ] Update this architecture document

### When Modifying Existing Features

- [ ] Check for breaking changes to existing interfaces
- [ ] Update related services if needed
- [ ] Maintain backward compatibility
- [ ] Update tests
- [ ] Update documentation

### Common Patterns to Follow

1. **Service Pattern**: Use services for business logic and data access
2. **Interface Pattern**: Define interfaces for all data structures
3. **Reactive Pattern**: Use RxJS for async operations
4. **Component Pattern**: Keep components focused on presentation
5. **Error Handling Pattern**: Implement consistent error handling
6. **Testing Pattern**: Write tests for all new functionality

This architecture document should be updated whenever new common services, components, or utilities are added to ensure consistency across the application. 