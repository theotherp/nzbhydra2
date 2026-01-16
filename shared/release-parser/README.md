# Release Parser

A Java library for parsing movie release names and extracting quality information such as source, resolution, codec, and more.

## Attribution

This library is inspired by and based on the parsing logic from [Radarr](https://github.com/Radarr/Radarr), an open-source movie collection manager. The regex patterns and parsing approach were adapted from Radarr's C# implementation to Java.

Radarr is licensed under the GNU General Public License v3.0.

## Purpose

When downloading movies from various sources, release names follow a common naming convention that encodes quality information:

```
Movie.Title.2023.1080p.BluRay.x264-GROUP
```

This library parses these release names to extract:

- **Movie title and year**
- **Video source** (BluRay, WEB-DL, HDTV, CAM, etc.)
- **Resolution** (480p, 720p, 1080p, 2160p/4K)
- **Video codec** (x264, x265/HEVC, XviD, AV1)
- **Release group**
- **Edition** (Director's Cut, Extended, IMAX, etc.)
- **HDR information** (HDR10, Dolby Vision)
- **Hardcoded subtitles detection**
- **Languages**

### Quality Analysis

The library also provides quality analysis features:

- **Quality ratings** (1-10 scale) to quickly assess release quality
- **Warnings** about poor quality sources (CAM, Telesync) or issues (hardcoded subs)
- **Release comparison** to determine which of two releases is better quality

This is useful for:
- Automatically categorizing movie downloads
- Warning users about poor quality releases before downloading
- Comparing multiple releases to choose the best one
- Building media management applications

## Requirements

- Java 17 or higher
- Maven 3.6+

## Installation

Clone the repository and build with Maven:

```bash
mvn clean install
```

## Usage

### Basic Parsing

```java
import com.releaseparser.parser.ReleaseParser;
import com.releaseparser.model.ReleaseInfo;

ReleaseParser parser = new ReleaseParser();
ReleaseInfo info = parser.parse("The.Matrix.1999.1080p.BluRay.x264-SPARKS");

System.out.println(info.getMovieTitle());    // "The Matrix"
System.out.println(info.getYear());          // 1999
System.out.println(info.getSource());        // Source.BLURAY
System.out.println(info.getResolution());    // Resolution.R1080P
System.out.println(info.getCodec());         // Codec.X264
System.out.println(info.getReleaseGroup());  // "SPARKS"
```

### Quality Analysis

```java
import com.releaseparser.analyzer.QualityAnalyzer;

QualityAnalyzer analyzer = new QualityAnalyzer();

// Get quality rating (1-10)
int rating = analyzer.getQualityRating(info);
String description = analyzer.getQualityDescription(rating);
// rating: 7, description: "Good - High quality release"

// Get warnings
List<QualityWarning> warnings = analyzer.analyze(info);
// [INFO] Blu-ray source - high quality
```

### Detecting Poor Quality Releases

```java
ReleaseInfo camRelease = parser.parse("New.Movie.2024.HDCAM.x264-NOGRP");
List<QualityWarning> warnings = analyzer.analyze(camRelease);

// Outputs:
// [CRITICAL] CAM source - extremely poor quality (camera recording from cinema)
```

### Detecting Hardcoded Subtitles

```java
ReleaseInfo hcRelease = parser.parse("Movie.2024.1080p.BluRay.HC.x264-GROUP");

if (hcRelease.isHardcodedSubs()) {
    System.out.println("Warning: This release has hardcoded subtitles!");
}

// Analyzer also warns:
// [WARNING] Contains HARDCODED subtitles - these cannot be disabled
```

### Comparing Releases

```java
ReleaseInfo bluray = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP1");
ReleaseInfo webdl = parser.parse("Movie.2024.1080p.WEB-DL.x264-GROUP2");

ComparisonResult result = analyzer.compare(bluray, webdl);

if (result.hasClearWinner()) {
    System.out.println("Better release: " + result.better().getOriginalTitle());
    System.out.println("Reasons: " + result.reasons());
}
// Better release: Movie.2024.1080p.BluRay.x264-GROUP1
// Reasons: [Blu-ray source is better than WEB-DL]
```

## Quality Rankings

### Sources (worst to best)

| Rank | Source | Description |
|------|--------|-------------|
| 1 | CAM | Camera recording from cinema |
| 2 | Telesync | Direct audio, CAM video |
| 3 | Telecine | Copied from film reel |
| 4 | Workprint | Unfinished version |
| 5-6 | Screener | Pre-release review copy |
| 7-10 | SDTV/DVD | Standard definition |
| 11-13 | HDTV | HD TV recording |
| 14-15 | WEB-DL/WEBRip | Streaming service |
| 16-17 | BDRip/BRRip | Blu-ray encode |
| 18 | Blu-ray | Direct Blu-ray encode |
| 19 | Remux | Untouched Blu-ray |

### Resolutions

| Resolution | Quality |
|------------|---------|
| 360p-576p | SD (Standard Definition) |
| 720p | HD (High Definition) |
| 1080p | Full HD |
| 2160p/4K | Ultra HD |

## Running the Demo

```bash
mvn compile exec:java -Dexec.mainClass="com.releaseparser.Demo"
```

## Running Tests

```bash
mvn test
```

## License

This project is provided for educational purposes. The parsing logic is derived from Radarr which is licensed under GPL-3.0.
