angular
    .module('nzbhydraApp')
    .factory('ExternalToolRequestFactory', ExternalToolRequestFactory);

function ExternalToolRequestFactory() {
    return {
        build: build
    };

    // Keep this JSON shape aligned with org.nzbhydra.externaltools.AddRequest.
    function build(model, addType) {
        model = model || {};
        return {
            configureForUsenet: model.configureForUsenet === true,
            configureForTorrents: model.configureForTorrents === true,
            nzbhydraName: model.nzbhydraName,
            externalTool: normalizeExternalTool(model.externalTool || model.type),
            xdarrHost: model.xdarrHost || model.host,
            xdarrApiKey: model.xdarrApiKey || model.apiKey,
            nzbhydraHost: model.nzbhydraHost,
            addType: addType || model.addType || "SINGLE",
            enableRss: model.enableRss === true,
            enableAutomaticSearch: model.enableAutomaticSearch === true,
            enableInteractiveSearch: model.enableInteractiveSearch === true,
            removeYearFromSearchString: model.removeYearFromSearchString === true,
            earlyDownloadLimit: model.earlyDownloadLimit,
            addUsenet: model.addUsenet === true,
            addTorrent: model.addTorrent === true,
            addDisabledIndexers: model.addDisabledIndexers === true,
            additionalParameters: model.additionalParameters,
            minimumSeeders: model.minimumSeeders,
            seedRatio: model.seedRatio,
            seedTime: model.seedTime,
            seasonPackSeedTime: model.seasonPackSeedTime,
            discographySeedTime: model.discographySeedTime,
            categories: model.categories,
            animeCategories: model.animeCategories,
            priority: model.priority,
            useHydraPriorities: model.useHydraPriorities === true
        };
    }

    function normalizeExternalTool(externalTool) {
        var tools = {
            SONARR: "Sonarr",
            RADARR: "Radarr",
            LIDARR: "Lidarr",
            READARR: "Readarr"
        };
        return tools[externalTool] || externalTool;
    }
}
