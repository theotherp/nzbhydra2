package org.nzbhydra.web;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.nzbhydra.Markdown;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelpWeb {

    @GetMapping(value = "/internalapi/help/{section}", produces = MediaType.TEXT_HTML_VALUE)
    @Secured({"ROLE_ADMIN"})
    public String askForAdmin(@PathVariable String section) throws Exception {
        String markdown = Resources.toString(Resources.getResource(HelpWeb.class, ("/help/" + section + ".md").toLowerCase()), Charsets.UTF_8);
        return Markdown.renderMarkdownAsHtml(markdown);
    }


}
