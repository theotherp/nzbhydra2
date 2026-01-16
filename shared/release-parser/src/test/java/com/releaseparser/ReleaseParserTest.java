package com.releaseparser;

import com.releaseparser.model.Codec;
import com.releaseparser.model.ReleaseInfo;
import com.releaseparser.model.Resolution;
import com.releaseparser.model.Source;
import com.releaseparser.parser.ReleaseParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReleaseParserTest {

    private ReleaseParser parser;

    @BeforeEach
    void setUp() {
        parser = new ReleaseParser();
    }

    @Nested
    class SourceParsing {

        @Test
        void shouldParseBluraySource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.BLURAY);
        }

        @Test
        void shouldParseBDSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BD.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.BLURAY);
        }

        @Test
        void shouldParseWebDLSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.WEB-DL.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
        }

        @Test
        void shouldParseWebRipSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.WEBRip.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.WEBRIP);
        }

        @Test
        void shouldParseHDTVSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.720p.HDTV.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.HDTV);
        }

        @Test
        void shouldParseDVDRipSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.DVDRip.XviD-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.DVD);
        }

        @Test
        void shouldParseCAMSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.CAM.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.CAM);
        }

        @Test
        void shouldParseTSSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.TS.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.TELESYNC);
        }

        @Test
        void shouldParseTelecineSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.TC.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.TELECINE);
        }

        @Test
        void shouldParseScreenerSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.DVDSCR.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.SCREENER);
        }

        @Test
        void shouldParseRemuxSource() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.UHD.BluRay.Remux.HEVC-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.REMUX);
            assertThat(info.isRemux()).isTrue();
        }

        @Test
        void shouldParseAmazonWebDL() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.AMZN.WEB-DL.DDP5.1.H.264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
        }

        @Test
        void shouldParseNetflixWebDL() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.NF.WEB-DL.DDP5.1.x264-GROUP");
            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
        }
    }

    @Nested
    class ResolutionParsing {

        @Test
        void shouldParse480pResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.480p.BluRay.x264-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R480P);
        }

        @Test
        void shouldParse720pResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.720p.BluRay.x264-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R720P);
        }

        @Test
        void shouldParse1080pResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
        }

        @Test
        void shouldParse2160pResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.BluRay.x265-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R2160P);
        }

        @Test
        void shouldParse4kResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.4K.UHD.BluRay.x265-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R2160P);
        }

        @Test
        void shouldParseFHDResolution() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.FHD.BluRay.x264-GROUP");
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
        }
    }

    @Nested
    class CodecParsing {

        @Test
        void shouldParseX264Codec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
        }

        @Test
        void shouldParseX265Codec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.BluRay.x265-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.X265);
        }

        @Test
        void shouldParseHEVCCodec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.BluRay.HEVC-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.X265);
        }

        @Test
        void shouldParseH264Codec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.WEB-DL.H.264-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
        }

        @Test
        void shouldParseXviDCodec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.DVDRip.XviD-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.XVID);
        }

        @Test
        void shouldParseAV1Codec() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.WEB-DL.AV1-GROUP");
            assertThat(info.getCodec()).isEqualTo(Codec.AV1);
        }
    }

    @Nested
    class HardcodedSubsParsing {

        @Test
        void shouldDetectHCSubbed() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.HC.x264-GROUP");
            assertThat(info.isHardcodedSubs()).isTrue();
        }

        @Test
        void shouldDetectSubbed() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.SUBBED.BluRay.x264-GROUP");
            assertThat(info.isHardcodedSubs()).isTrue();
        }

        @Test
        void shouldDetectKoreanSubs() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.KoreanSUBS.x264-GROUP");
            assertThat(info.isHardcodedSubs()).isTrue();
            assertThat(info.getHardcodedSubsLanguage()).isEqualTo("Korean");
        }

        @Test
        void shouldNotDetectSoftSubs() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.SOFTSUBS.x264-GROUP");
            assertThat(info.isHardcodedSubs()).isFalse();
        }

        @Test
        void shouldNotDetectMultiSubs() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.MULTISUBS.x264-GROUP");
            assertThat(info.isHardcodedSubs()).isFalse();
        }
    }

    @Nested
    class TitleParsing {

        @Test
        void shouldParseMovieTitleWithYear() {
            ReleaseInfo info = parser.parse("The.Thingy.1999.1080p.BluRay.x264-GROUP");
            assertThat(info.getMovieTitle()).isEqualTo("The Thingy");
            assertThat(info.getYear()).isEqualTo(1999);
        }

        @Test
        void shouldParseMovieTitleWithSpaces() {
            ReleaseInfo info = parser.parse("Protectory of the Universe Vol 3 2023 1080p BluRay x264-GROUP");
            assertThat(info.getMovieTitle()).isEqualTo("Protectory of the Universe Vol 3");
            assertThat(info.getYear()).isEqualTo(2023);
        }

        @Test
        void shouldParseMovieTitleWithDotsAndYear() {
            ReleaseInfo info = parser.parse("Revengers.Startgame.2019.2160p.UHD.BluRay.x265-GROUP");
            assertThat(info.getMovieTitle()).isEqualTo("Revengers Startgame");
            assertThat(info.getYear()).isEqualTo(2019);
        }
    }

    @Nested
    class ReleaseGroupParsing {

        @Test
        void shouldParseReleaseGroup() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-SPARKS");
            assertThat(info.getReleaseGroup()).isEqualTo("SPARKS");
        }

        @Test
        void shouldParseReleaseGroupWithNumbers() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-D3G");
            assertThat(info.getReleaseGroup()).isEqualTo("D3G");
        }

        @Test
        void shouldParseYIFYGroup() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-YIFY");
            assertThat(info.getReleaseGroup()).isEqualTo("YIFY");
        }
    }

    @Nested
    class VersionAndProperParsing {

        @Test
        void shouldDetectProper() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.PROPER.x264-GROUP");
            assertThat(info.isProper()).isTrue();
        }

        @Test
        void shouldDetectRepack() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.REPACK.x264-GROUP");
            assertThat(info.isRepack()).isTrue();
        }

        @Test
        void shouldDetectVersion2() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264.v2-GROUP");
            assertThat(info.getVersion()).isEqualTo(2);
        }
    }

    @Nested
    class EditionParsing {

        @Test
        void shouldParseDirectorsCut() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.Directors.Cut.1080p.BluRay.x264-GROUP");
            assertThat(info.getEdition()).containsIgnoringCase("director");
        }

        @Test
        void shouldParseExtendedEdition() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.Extended.Edition.1080p.BluRay.x264-GROUP");
            assertThat(info.getEdition()).containsIgnoringCase("extended");
        }

        @Test
        void shouldParseUnratedEdition() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.UNRATED.1080p.BluRay.x264-GROUP");
            assertThat(info.getEdition()).containsIgnoringCase("unrated");
        }

        @Test
        void shouldParseIMAX() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.IMAX.1080p.BluRay.x264-GROUP");
            assertThat(info.getEdition()).containsIgnoringCase("IMAX");
        }
    }

    @Nested
    class HDRParsing {

        @Test
        void shouldDetectHDR() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.UHD.BluRay.HDR.x265-GROUP");
            assertThat(info.isHdr()).isTrue();
        }

        @Test
        void shouldDetectHDR10() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.UHD.BluRay.HDR10.x265-GROUP");
            assertThat(info.isHdr()).isTrue();
        }

        @Test
        void shouldDetectDolbyVision() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.UHD.BluRay.DoVi.x265-GROUP");
            assertThat(info.isDolbyVision()).isTrue();
            assertThat(info.isHdr()).isTrue();
        }

        @Test
        void shouldDetectDV() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.2160p.UHD.BluRay.DV.HDR.x265-GROUP");
            assertThat(info.isDolbyVision()).isTrue();
        }
    }

    @Nested
    class ThreeDParsing {

        @Test
        void shouldDetect3D() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.3D.1080p.BluRay.x264-GROUP");
            assertThat(info.isThreeDimensional()).isTrue();
        }

        @Test
        void shouldDetectSBS() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.SBS.x264-GROUP");
            assertThat(info.isThreeDimensional()).isTrue();
        }
    }

    @Nested
    class LanguageParsing {

        @Test
        void shouldDetectGermanLanguage() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.GERMAN.1080p.BluRay.x264-GROUP");
            assertThat(info.getLanguages()).contains("German");
        }

        @Test
        void shouldDetectFrenchLanguage() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.FRENCH.1080p.BluRay.x264-GROUP");
            assertThat(info.getLanguages()).contains("French");
        }

        @Test
        void shouldDetectMultipleLanguages() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.MULTI.FRENCH.GERMAN.1080p.BluRay.x264-GROUP");
            assertThat(info.getLanguages()).containsExactlyInAnyOrder("Multi", "French", "German");
        }
    }

    @Nested
    class WebsiteCleanup {

        @Test
        void shouldRemoveWebsitePrefix() {
            ReleaseInfo info = parser.parse("[www.example.com] Movie.Title.2023.1080p.BluRay.x264-GROUP");
            assertThat(info.getMovieTitle()).isEqualTo("Movie Title");
        }

        @Test
        void shouldRemoveTorrentSuffix() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.BluRay.x264-GROUP[rarbg]");
            assertThat(info.getReleaseGroup()).isEqualTo("GROUP");
        }
    }

    @Nested
    class RealWorldExamples {

        @Test
        void shouldParseComplexTitle1() {
            ReleaseInfo info = parser.parse("NuclearBombGuy.2023.IMAX.2160p.UHD.BluRay.Remux.DV.HDR.HEVC.TrueHD.Atmos.7.1-FGT");

            assertThat(info.getMovieTitle()).isEqualTo("NuclearBombGuy");
            assertThat(info.getYear()).isEqualTo(2023);
            assertThat(info.getResolution()).isEqualTo(Resolution.R2160P);
            assertThat(info.getSource()).isEqualTo(Source.REMUX);
            assertThat(info.getCodec()).isEqualTo(Codec.X265);
            assertThat(info.isHdr()).isTrue();
            assertThat(info.isDolbyVision()).isTrue();
            assertThat(info.isRemux()).isTrue();
            assertThat(info.getReleaseGroup()).isEqualTo("FGT");
        }

        @Test
        void shouldParseComplexTitle2() {
            ReleaseInfo info = parser.parse("The.Uncle.1972.REMASTERED.1080p.BluRay.x264.DTS-HD.MA.5.1-FGT");

            assertThat(info.getMovieTitle()).isEqualTo("The Uncle");
            assertThat(info.getYear()).isEqualTo(1972);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getSource()).isEqualTo(Source.BLURAY);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
            assertThat(info.getEdition()).containsIgnoringCase("remastered");
        }

        @Test
        void shouldParseLowQualityTitle() {
            ReleaseInfo info = parser.parse("New.Movie.2024.HDCAM.x264-NOGRP");

            assertThat(info.getSource()).isEqualTo(Source.CAM);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
        }

        @Test
        void shouldParseStreamingServiceTitle() {
            ReleaseInfo info = parser.parse("Movie.Title.2023.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-FLUX");

            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
            assertThat(info.getReleaseGroup()).isEqualTo("FLUX");
        }
    }

    @Nested
    class UnderscoreSeparators {

        @Test
        void shouldParseWithUnderscoreSeparators() {
            ReleaseInfo info = parser.parse("Lies_and_Lorries_2025_BluRay_1080p_AVC_DD5_1-MTeam");

            assertThat(info.getMovieTitle()).isEqualTo("Lies and Lorries");
            assertThat(info.getYear()).isEqualTo(2025);
            assertThat(info.getSource()).isEqualTo(Source.BLURAY);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getReleaseGroup()).isEqualTo("MTeam");
        }

        @Test
        void shouldParseMixedSeparators() {
            ReleaseInfo info = parser.parse("Some_Movie.2024.1080p_WEB-DL_x264-GROUP");

            assertThat(info.getMovieTitle()).isEqualTo("Some Movie");
            assertThat(info.getYear()).isEqualTo(2024);
            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
        }
    }

    @Nested
    class StandaloneWebSource {

        @Test
        void shouldParseStandaloneWebAsWebDL() {
            ReleaseInfo info = parser.parse("Words.2025.1080p.WEB.H264-CBFM");

            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
            assertThat(info.getReleaseGroup()).isEqualTo("CBFM");
        }

        @Test
        void shouldNotMisparseWebAsTelesync() {
            ReleaseInfo info = parser.parse("Limits.2025.1080P.WEB.H264-GRASHOPR");

            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getSource()).isNotEqualTo(Source.TELESYNC);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
        }

        @Test
        void shouldParseWebWithMulti() {
            ReleaseInfo info = parser.parse("Rip.2026.MULTI.1080p.WEB.X264-HiggsBoson");

            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
            assertThat(info.getLanguages()).contains("Multi");
        }

        @Test
        void shouldParseWebDLWithBroadcaster() {
            ReleaseInfo info = parser.parse("Enforcer.1976.1080p.ITV.WEB-DL.AAC.2.0.H.264-PiRaTeS");

            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
            assertThat(info.getCodec()).isEqualTo(Codec.X264);
            assertThat(info.getReleaseGroup()).isEqualTo("PiRaTeS");
        }
    }

    @Nested
    class MultiLanguageDetection {

        @Test
        void shouldDetectMultiLanguageIndicator() {
            ReleaseInfo info = parser.parse("Story.2024.MULTi.1080p.WEB.H264-FW");

            assertThat(info.getLanguages()).contains("Multi");
            assertThat(info.getSource()).isEqualTo(Source.WEBDL);
            assertThat(info.getResolution()).isEqualTo(Resolution.R1080P);
        }

        @Test
        void shouldDetectMultiWithMixedCase() {
            ReleaseInfo info = parser.parse("Another.Film.2025.Multi.720p.BluRay.x264-GRP");

            assertThat(info.getLanguages()).contains("Multi");
        }
    }
}
