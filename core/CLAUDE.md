# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NZBHydra2 is a meta search application for usenet indexers written in Java (Spring Boot) with an Angular frontend. It aggregates search results from multiple indexers and provides a unified interface for searching and downloading NZB files.

## Core Architecture

### Backend (Java/Spring Boot)

- **Main Application**: `org.nzbhydra.NzbHydra` - Entry point located at `src/main/java/org/nzbhydra/NzbHydra.java`
- **Configuration**: Spring Boot application with YAML configuration (`nzbhydra.yml`)
- **Database**: H2 database with JPA/Hibernate and Flyway migrations
- **Security**: Spring Security with custom authentication filters
- **API**: RESTful endpoints for frontend communication and external Newznab API compatibility

### Frontend Architecture

- **Legacy UI**: AngularJS 1.x application in `ui-src/` (being replaced)
- **New UI**: Angular 20+ application in `ui-src/hydra-ng/` (current development)
- **Build System**: Dual build system supporting both legacy (Gulp) and modern (Angular CLI) frontends

### Key Components

- **Indexers**: `src/main/java/org/nzbhydra/indexers/` - Individual indexer implementations (Newznab, NZBGeek, etc.)
- **Search**: Search orchestration and result aggregation
- **Download**: NZB file handling and downloader integration (SABnzbd, NZBGet)
- **Configuration**: Web-based configuration management
- **Stats/History**: Search and download tracking

## Common Development Commands

### Backend (Java/Maven)

```bash
# Build the application
mvn clean package

# Run tests
mvn test

# Run the application in development mode
mvn spring-boot:run -Pdev

# Build native image (requires GraalVM)
mvn -Pnative native:compile
```

### Frontend - Legacy UI (Gulp)

```bash
# Install dependencies
npm install

# Build frontend assets
gulp index

# Watch for changes and rebuild
gulp default
```

### Frontend - New UI (Angular)

```bash
# Navigate to Angular project
cd ui-src/hydra-ng

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Testing

- **Backend Tests**: Located in `src/test/java/`, run with `mvn test`
- **Frontend Tests**: Angular tests in `ui-src/hydra-ng/src/`, run with `npm test`

## Build Process

The application uses Maven for overall build orchestration:

1. Maven compiles Java sources
2. Frontend assets are built (either through Gulp or Angular CLI)
3. Static resources are copied to `src/main/resources/static/`
4. Spring Boot packages everything into an executable JAR

## Key Configuration Files

- `pom.xml` - Maven configuration and dependencies
- `nzbhydra.yml` - Application configuration
- `src/main/resources/application.properties` - Spring Boot properties
- `ui-src/hydra-ng/angular.json` - Angular CLI configuration
- `gulpfile.js` - Legacy frontend build configuration

## Development Notes

- The project is transitioning from AngularJS to modern Angular
- Both frontend systems currently coexist
- Configuration is managed through a web interface
- The application supports both JVM and native (GraalVM) execution
- Database migrations are handled by Flyway in `src/main/resources/migration/`

## Running the Application

1. Build: `mvn clean package`
2. Run: `java -jar target/core-*-exec.jar`
3. Access: http://localhost:5076 (default port)