package org.nzbhydra.mockserver;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MockWebhookResponse {

    private static final Logger logger = LoggerFactory.getLogger(MockWebhookResponse.class);

    @RequestMapping(value = "/hooks/search", method = RequestMethod.PUT)
    public Object receiveSearchWebhok(@RequestBody String body) throws Exception {
        logger.info(body);
        return "OK";
    }

    @RequestMapping(value = "/hooks/download", method = RequestMethod.PUT)
    public Object receiveDownloadWebhok(@RequestBody String body) throws Exception {
        logger.info(body);
        return "OK";
    }


}
