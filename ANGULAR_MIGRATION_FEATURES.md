# NZBHydra2 AngularJS to Angular Migration - Feature Documentation

This document describes all the functionality implemented in the original AngularJS codebase (`core/ui-src/js/` and `core/ui-src/html/`) that needs to be migrated to Angular 17+. This serves as a comprehensive reference to ensure no
features are lost during the migration.

## Table of Contents

1. [Application Structure](#application-structure)
2. [Core Features](#core-features)
3. [Search Functionality](#search-functionality)
4. [Configuration System](#configuration-system)
5. [Statistics and Analytics](#statistics-and-analytics)
6. [Download Management](#download-management)
7. [History Management](#history-management)
8. [System Management](#system-management)
9. [User Interface Components](#user-interface-components)
10. [Services and Data Management](#services-and-data-management)
11. [Authentication and Security](#authentication-and-security)
12. [Real-time Features](#real-time-features)

## Application Structure

### Main Application Module (`nzbhydra.js`)

- **AngularJS Module**: `nzbhydraApp` with multiple dependencies
- **Dependencies**:
    - `angular-loading-bar`, `cgBusy`, `ui.bootstrap`, `ipCookie`, `angular-growl`
    - `angular.filter`, `filters`, `ui.router`, `blockUI`, `mgcrea.ngStrap`
    - `angularUtils.directives.dirPagination`, `nvd3`, `formly`, `formlyBootstrap`
    - `frapontillo.bootstrap-switch`, `ui.select`, `ngSanitize`, `checklist-model`
    - `ngAria`, `ngMessages`, `ui.router.title`, `LocalStorageModule`
    - `ngFileUpload`, `ngCookies`, `angular.chips`, `templates`, `base64`, `duScroll`, `colorpicker.module`

### Routing Structure

- **Root State**: Abstract state with header view
- **Config States**: Multiple nested states for different configuration sections
    - `root.config.main` - Main configuration
    - `root.config.auth` - Authentication settings
    - `root.config.searching` - Search configuration
    - `root.config.categories` - Category management
    - `root.config.downloading` - Download settings
    - `root.config.indexers` - Indexer configuration
- **Search States**: Search interface and results
- **Stats States**: Statistics and analytics
- **System States**: System information and management

## Core Features

### Authentication System (`hydra-auth-service.js`)

- **User Authentication**: Login/logout functionality
- **Role-based Access**: Different permission levels (admin, user)
- **Session Management**: Cookie-based session handling
- **Login Required Guards**: Route protection for different user types

### Configuration Management (`config-service.js`, `config-controller.js`)

- **Dynamic Form Generation**: Using Formly for complex configuration forms
- **Configuration Tabs**: Multiple configuration sections
- **Advanced/Basic Mode**: Toggle between simple and advanced configuration views
- **External Tool Integration**: Auto-configuration for Sonarr, Radarr, etc.
- **API Documentation**: Built-in API help system

### Search System (`search-controller.js`, `search-service.js`)

- **Multi-indexer Search**: Search across multiple NZB indexers
- **Autocomplete**: Movie/TV show autocomplete with poster images
- **Category-based Search**: Different search types (TV, Movie, Music, etc.)
- **Advanced Filters**: Age, size, indexer selection
- **Search History**: Previous searches with drag-and-drop functionality
- **Real-time Search**: Live search updates and cancellation

## Search Functionality

### Search Interface (`search.html`)

- **Category Dropdown**: Dynamic category selection with size presets
- **Autocomplete Integration**: Typeahead with poster images for movies/TV
- **Season/Episode Inputs**: TV-specific search parameters
- **Indexer Selection**: Multi-select indexer filtering
- **Advanced Filters**: Age and size range inputs
- **Search History**: Dropdown with previous searches

### Search Results (`search-results-controller.js`, `search-results.html`)

- **Indexer Status Display**: Real-time indexer search status
- **Result Grouping**: Group by episodes, torrents, etc.
- **Advanced Filtering**: Multiple filter types (source, quality, custom)
- **Sorting Options**: Multiple sort columns with direction
- **Pagination**: Load more results with infinite scroll
- **Selection Management**: Multi-select with shift-click support
- **Download Options**: Individual and bulk download buttons
- **Zip Download**: Bulk download as ZIP file
- **Duplicate Detection**: Show/hide duplicate results
- **Download Indicators**: Show already downloaded items

### Search Features

- **Result Grouping**: Group TV episodes by season/episode
- **Filter Buttons**: Quick filter buttons for video content
- **Custom Filters**: User-defined filter buttons
- **Sort Persistence**: Remember user's sort preferences
- **Display Options**: Toggle various display features
- **Rejected Results**: Show why results were rejected
- **Load More**: Progressive loading of results
- **Export Options**: Download selected results

## Configuration System

### Dynamic Form System (`config-fields-service.js`, `formly-*.js`)

- **Formly Integration**: Dynamic form generation
- **Field Types**: Various input types (text, select, checkbox, etc.)
- **Validation**: Client-side and server-side validation
- **Conditional Fields**: Show/hide fields based on other values
- **Repeating Sections**: Dynamic add/remove of configuration sections
- **Tooltips and Help**: Inline help system
- **Advanced Mode**: Toggle between basic and advanced views

### Configuration Sections

- **Main Configuration**: General application settings
- **Authentication**: User management and security
- **Searching**: Search behavior and limits
- **Categories**: Category definitions and mappings
- **Downloading**: Download client configuration
- **Indexers**: Indexer management and settings

### Indexer Configuration (`formly-indexers.js`)

- **Indexer Types**: Support for various indexer types
- **Connection Testing**: Test indexer connectivity
- **Capabilities Check**: Verify indexer features
- **Preset Management**: Predefined indexer configurations
- **Authentication**: API key and credential management

### Downloader Configuration (`formly-downloaders.js`)

- **Download Client Types**: Support for various download clients
- **Connection Testing**: Test download client connectivity
- **Category Mapping**: Map categories to download client categories
- **Authentication**: Download client credentials

## Statistics and Analytics

### Statistics System (`stats-controller.js`, `main-stats.html`)

- **Date Range Selection**: Customizable date ranges for statistics
- **Multiple Chart Types**: Bar charts, pie charts, line charts
- **Real-time Updates**: Live statistics updates
- **Chart Toggle**: Enable/disable individual statistics
- **Export Options**: Export statistics data

### Statistics Categories

- **Indexer Performance**: Response times, success rates, uniqueness scores
- **Download Statistics**: Downloads per indexer, age, time, success rates
- **Search Statistics**: Searches per time period, user activity
- **User Statistics**: User activity and preferences, IP-based statistics
- **System Statistics**: System health and performance, CPU usage
- **Time-based Statistics**: Hourly/daily patterns, day-of-week analysis

### Chart Integration (`nvd3`)

- **Multiple Chart Types**: Bar, pie, line, area charts
- **Interactive Charts**: Hover effects, zoom, pan
- **Responsive Design**: Charts adapt to screen size
- **Data Export**: Export chart data
- **Custom Styling**: Branded chart appearance

## Download Management

### Download System (`nzb-download-service.js`, `download-history-controller.js`)

- **NZB Download**: Download NZB files to download clients
- **Torrent Support**: Handle torrent downloads
- **Download History**: Track download history
- **Status Monitoring**: Real-time download status
- **Bulk Operations**: Download multiple items at once

### Download Features

- **Individual Downloads**: Download single NZB files
- **Bulk Downloads**: Download multiple selected items
- **Zip Downloads**: Package multiple NZBs in ZIP
- **Download History**: View and manage download history
- **Status Tracking**: Monitor download progress
- **Error Handling**: Handle download failures

## History Management

### Search History (`search-history-controller.js`, `search-history-service.js`)

- **Search History Display**: View all previous searches
- **Filtering Options**: Filter by category, time range, access type
- **Sorting**: Sort by time, query, category, etc.
- **Repeated Searches**: Re-execute previous searches
- **User Information**: Show username/IP based on configuration
- **Query Formatting**: Format complex queries with identifiers
- **External Links**: Links to TMDB, IMDB, TVDB, TVMaze
- **Pagination**: Load more history entries
- **Column Management**: Dynamic column sizing based on data

### Download History (`download-history-controller.js`)

- **Download Tracking**: Track all NZB downloads
- **Status Monitoring**: Monitor download status (requested, successful, failed)
- **Filtering**: Filter by indexer, status, time range
- **Status Icons**: Visual status indicators with tooltips
- **User Information**: Show username/IP based on configuration
- **Pagination**: Load more download history
- **Column Management**: Dynamic column sizing

### Notification History (`notification-history-controller.js`)

- **Notification Display**: View all system notifications
- **Event Types**: Filter by notification event types
- **Time-based Filtering**: Filter by time ranges
- **Event Formatting**: Human-readable event descriptions
- **Pagination**: Load more notification history
- **Column Management**: Optimized column layout

## System Management

### Indexer Statuses (`indexer-statuses-controller.js`)

- **Indexer Health Monitoring**: Real-time indexer status
- **Status Types**: Enabled, disabled (system/user), temporary disabled
- **VIP Expiration Warnings**: Alert for expiring VIP access
- **Visual Indicators**: Color-coded status labels
- **Expiration Tracking**: Track VIP expiration dates
- **Status Formatting**: Human-readable status descriptions

### System Control (`system-controller.js`)

- **Application Control**: Shutdown, restart, reload configuration
- **System Information**: Display system health and performance
- **CPU Usage Monitoring**: Real-time CPU usage charts
- **Debug Information**: Generate debug reports
- **SQL Execution**: Execute custom SQL queries for debugging
- **Thread Dumps**: Generate thread dumps for analysis
- **Heap Dumps**: Create memory heap dumps
- **Tab Management**: Multiple system management tabs

### Update Management (`update-service.js`)

- **Version Checking**: Check for available updates
- **Automatic Updates**: Handle automatic update notifications
- **Manual Updates**: Manual update installation
- **Version History**: Display version change history
- **Update Ignoring**: Ignore specific versions
- **Beta Updates**: Handle beta version updates
- **Update Progress**: Real-time update progress monitoring
- **Changelog Display**: Show changes between versions

### Backup System (`backup-service.js`)

- **Backup Management**: List and manage backups
- **Backup Restoration**: Restore from backup files
- **Backup Creation**: Create system backups
- **Backup History**: View backup history
- **Restore Validation**: Validate backup integrity

### Bug Reporting (`bugreport.html`)

- **Debug Information**: Generate anonymized debug reports
- **File Upload**: Upload debug info to file sharing
- **Thread Dumps**: Generate thread dumps for analysis
- **Heap Dumps**: Create memory heap dumps
- **SQL Debugging**: Execute custom SQL queries
- **CPU Monitoring**: Real-time CPU usage graphs
- **Endpoint Listing**: List all HTTP endpoints
- **Error Reporting**: Comprehensive error reporting system

### News System (`news-modal.html`)

- **News Display**: Show application news and updates
- **Version News**: News specific to versions
- **News Formatting**: Rich text news content
- **Modal Display**: News displayed in modal dialogs
- **News History**: Archive of previous news items

### Tasks Management

- **Background Tasks**: Monitor background task execution
- **Task Status**: Real-time task status monitoring
- **Task Logging**: Task execution logging
- **Task Control**: Start/stop background tasks
- **Task Progress**: Progress tracking for long-running tasks

### Log Viewing

- **Log Display**: View application logs
- **Log Filtering**: Filter logs by level, time, source
- **Log Search**: Search within log content
- **Log Export**: Export log data
- **Real-time Logs**: Live log updates
- **Log Levels**: Different log level displays

## User Interface Components

### Directives (`directives/`)

- **Search Result Directive**: Individual search result display
- **Download Buttons**: NZB and torrent download buttons
- **Indexer Selection**: Multi-select indexer picker
- **Connection Testing**: Test connection buttons
- **Modal System**: Reusable modal dialogs
- **Data Tables**: Sortable and filterable tables
- **Form Components**: Custom form inputs
- **Status Indicators**: Real-time status displays

### UI Features

- **Responsive Design**: Mobile-friendly interface
- **Loading States**: Loading indicators and spinners
- **Error Handling**: User-friendly error messages
- **Notifications**: Toast notifications and alerts
- **Tooltips**: Context-sensitive help
- **Keyboard Navigation**: Keyboard shortcuts and navigation
- **Drag and Drop**: Drag-and-drop functionality
- **Focus Management**: Automatic focus handling

### Modal System (`modal.js`, `modal-service.js`)

- **Reusable Modals**: Generic modal system
- **Custom Modals**: Specialized modal types
- **Modal Stacking**: Multiple modal support
- **Backdrop Handling**: Modal backdrop management
- **Animation Support**: Smooth modal transitions

## Services and Data Management

### Core Services

- **Search Service**: Handle search operations
- **Config Service**: Manage application configuration
- **Stats Service**: Handle statistics data
- **Notification Service**: Manage user notifications
- **Storage Service**: Local storage management
- **Update Service**: Handle application updates
- **Migration Service**: Data migration utilities

### Data Management

- **Local Storage**: Persistent user preferences
- **Session Storage**: Temporary data storage
- **API Integration**: RESTful API communication
- **Error Handling**: Comprehensive error management
- **Data Validation**: Input validation and sanitization
- **Caching**: Intelligent data caching

## Authentication and Security

### Security Features

- **Role-based Access**: Different permission levels
- **Session Management**: Secure session handling
- **CSRF Protection**: Cross-site request forgery protection
- **Input Validation**: Server-side input validation
- **Error Handling**: Secure error messages
- **Logout Functionality**: Secure session termination

### User Management

- **User Registration**: User account creation
- **Password Management**: Secure password handling
- **User Profiles**: User preference management
- **Activity Logging**: User activity tracking

## Real-time Features

### Real-time Updates

- **Search Progress**: Live search status updates
- **Download Status**: Real-time download progress
- **Indexer Status**: Live indexer health monitoring
- **System Status**: Real-time system information
- **Notification Updates**: Live notification delivery

### WebSocket Integration

- **Real-time Communication**: WebSocket connections
- **Event Handling**: Real-time event processing
- **Connection Management**: WebSocket lifecycle management
- **Error Recovery**: Automatic reconnection

## Complex Behaviors

### Search Result Processing

- **Result Deduplication**: Remove duplicate results
- **Result Grouping**: Group related results
- **Result Filtering**: Apply multiple filter criteria
- **Result Sorting**: Multi-column sorting
- **Result Pagination**: Efficient result loading

### History Management

- **Dynamic Column Sizing**: Adjust column widths based on data availability
- **User Information Display**: Show username/IP based on configuration
- **Query Formatting**: Format complex queries with external identifiers
- **External Link Generation**: Create links to external databases (TMDB, IMDB, etc.)
- **Status Icon Generation**: Generate visual status indicators with tooltips
- **Filter Chain Management**: Complex filtering with multiple criteria
- **Sort State Persistence**: Remember user's sort preferences

### System Management

- **VIP Expiration Tracking**: Monitor and warn about expiring VIP access
- **CPU Usage Monitoring**: Real-time CPU usage with chart visualization
- **Debug Report Generation**: Create comprehensive debug information
- **SQL Query Execution**: Execute custom SQL for debugging
- **Update Progress Tracking**: Monitor update installation progress
- **Backup Management**: List, create, and restore system backups
- **Task Monitoring**: Monitor background task execution
- **Log Management**: View, filter, and search application logs

### Configuration Management

- **Dynamic Form Generation**: Runtime form creation
- **Validation Chains**: Complex validation rules
- **Dependency Management**: Field dependencies
- **State Persistence**: Save/restore configuration state

### Statistics Calculation

- **Real-time Calculation**: Live statistics updates
- **Data Aggregation**: Complex data processing
- **Chart Generation**: Dynamic chart creation
- **Performance Optimization**: Efficient data processing

### User Experience Features

- **Keyboard Shortcuts**: Power user features
- **Drag and Drop**: Intuitive interactions
- **Auto-complete**: Smart input assistance
- **Progressive Loading**: Smooth data loading
- **Error Recovery**: Graceful error handling

## Migration Considerations

### AngularJS to Angular 17+ Mapping

- **Controllers → Components**: Convert controllers to components
- **Services → Services**: Maintain service architecture
- **Directives → Components/Directives**: Convert to Angular equivalents
- **Filters → Pipes**: Convert filters to pipes
- **$scope → Component Properties**: Replace $scope with component properties
- **$http → HttpClient**: Update HTTP client usage
- **ui-router → Angular Router**: Migrate routing system

### State Management

- **NgRx**: For complex state management
- **Angular Signals**: For simple reactive state
- **Services**: For shared state and business logic
- **Local Storage**: For persistent user preferences

### UI Framework Migration

- **Bootstrap 3 → Bootstrap 5**: Update UI framework
- **Custom CSS → SCSS**: Modernize styling approach
- **Responsive Design**: Ensure mobile compatibility
- **Accessibility**: Improve accessibility features

### Performance Optimization

- **Lazy Loading**: Route-based code splitting
- **Tree Shaking**: Remove unused code
- **Bundle Optimization**: Optimize bundle size
- **Caching Strategy**: Implement intelligent caching

This documentation provides a comprehensive overview of all features that need to be migrated from the AngularJS codebase to Angular 17+. Each section should be carefully reviewed during the migration process to ensure no functionality is
lost. 