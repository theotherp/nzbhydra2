package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.ResponseEntity;

import java.util.List;

/**
 * Answers to {@code t=getnfo} requests.
 */
public final class NfoScenarios {

    /**
     * A request with an API key containing this marker gets the ASCII art NFO, see {@link #asciiArt()}.
     */
    public static final String ASCII_ART_APIKEY_MARKER = "asciinfo";

    private NfoScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(asciiArt(), legacyDefault());
    }

    /**
     * Reproduces the double escaping that real indexers cause for ASCII art NFOs: the indexer HTML-escapes the CP437
     * block glyphs into character references before putting them into the {@code <description>}, and then escaping
     * that description for XML escapes the ampersands of those character references again. The consumer therefore
     * unmarshals the description one level too little and is left holding the literal text {@code &#9608;} instead of
     * the block glyph.
     *
     * <p>To reproduce that on the wire, this description is built from plain text that already contains
     * {@code &#9608;} and friends; the XML marshaller escapes the {@code &} to {@code &amp;} on its own, which puts
     * exactly the double-escaped shape ({@code &amp;#9608;}) on the wire. Do not put real block glyphs in here and do
     * not hand-escape anything - that would either not reproduce the bug or double escape it a second time.</p>
     */
    public static Scenario asciiArt() {
        return new Scenario("nfo-ascii-art",
            "Getnfo response whose description contains the double escaped character references that a real "
            + "ASCII art NFO produces once an indexer's HTML escaping is escaped again for XML",
            Match.all(Match.action(ActionAttribute.GETNFO), Match.apikeyContains(ASCII_ART_APIKEY_MARKER)),
            context -> nfo("&#9608;&#9608;&#9608;&#9618;&#9618;&#9618;&#9617;&#9617;&#9617;\n"
                           + "&#9608;&#9617;&#9617;&#9618;&#9608;&#9618;&#9617;&#9617;&#9608;"));
    }

    /**
     * The catch all getnfo scenario, reproducing the body the controller used to build inline, byte for byte.
     */
    public static Scenario legacyDefault() {
        return new Scenario("nfo-default",
            "Getnfo response with a description naming the requested NZB id, like the old inline controller code",
            Match.action(ActionAttribute.GETNFO),
            context -> nfo("NFO for NZB with ID " + context.params().getId() + "\n" + """
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠿⠿⠿⢿⣿⣿⣿⣿⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣾⣿⣷⣦⣌⠙⢿⣿⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⣿⣿⣿⣿⣿⣷⡈⢻⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⠟⠋⣉⠙⢻⣿⣿⣿⣷⠀⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⠟⢁⣴⣿⣿⡷⢀⣿⣿⣿⡿⠀⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⠟⢁⣴⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣼⣿⣿
                ⣿⣿⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⠟⢁⣴⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣴⣿⣿⣿⣿
                ⣿⣿⣿⣿⣿⠟⢁⣴⣿⣿⠟⢁⣴⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣴⣿⣿⣿⣿⣿⣿
                ⣿⣿⣿⠟⢁⣴⣿⣿⣿⣿⣶⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣴⣿⣿⣿⣿⣿⣿⣿⣿
                ⣿⣿⠁⣴⣿⣿⣿⣿⣿⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                ⣿⣿⠀⢿⣿⣿⣿⣿⣿⡿⠋⣠⣾⣿⣿⠟⢁⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                ⣿⣿⣧⡈⠻⢿⣿⡿⠋⣠⣾⣿⣿⡟⢁⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                ⣿⣿⣿⣿⣷⣶⣶⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                """));
    }

    /**
     * The response shape every getnfo answer shares, which the controller used to build inline.
     *
     * <p>The total of 1 is load bearing: {@code Newznab.getNfo} reads a total of 0 as "this indexer has no NFO for
     * that result" and never looks at the description at all.</p>
     */
    private static ResponseEntity<?> nfo(String description) {
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();
        rssRoot.getRssChannel().setNewznabResponse(new NewznabXmlResponse(0, 1));
        NewznabXmlItem item = new NewznabXmlItem();
        item.setDescription(description);
        rssRoot.getRssChannel().getItems().add(item);
        return ResponseEntity.ok(rssRoot);
    }

}
