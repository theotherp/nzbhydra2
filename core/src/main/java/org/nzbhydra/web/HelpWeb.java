package org.nzbhydra.web;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.nzbhydra.Markdown;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelpWeb {

    @RequestMapping(value = "internalapi/help/{section}", method = RequestMethod.GET, produces = MediaType.TEXT_HTML_VALUE)
    @Secured({"ROLE_ADMIN"})
    public String askForAdmin(@PathVariable String section) throws Exception {
        String markdown = Resources.toString(Resources.getResource(HelpWeb.class, ("/help/" + section + ".md").toLowerCase()), Charsets.UTF_8);
        return Markdown.renderMarkdownAsHtml(markdown);
    }


}
