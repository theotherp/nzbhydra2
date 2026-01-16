

package org.nzbhydra.indexers;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.mapping.newznab.xml.Xml;

import java.net.URI;

public class DevIndexerTest {

    @InjectMocks
    private DevIndexer testee = new DevIndexer();

    @Test
    void testGeneration() throws Exception {
        Xml xml = testee.getAndStoreResultToDatabase(URI.create("http://127.0.01/duplicatesandtitlegroups"), null);
        NewznabXmlRoot root = (NewznabXmlRoot) xml;
        System.out.println(root);
    }


}
