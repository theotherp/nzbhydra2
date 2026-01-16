

package org.nzbhydra.tasks;

import org.nzbhydra.tasks.HydraTaskScheduler.TaskInformation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class HydraTasksWeb {

    @Autowired
    private HydraTaskScheduler hydraTaskScheduler;

    @RequestMapping(value = "/internalapi/tasks", produces = MediaType.APPLICATION_JSON_VALUE)
    @Secured({"ROLE_ADMIN"})
    public List<TaskInformation> getTasks() {
        return hydraTaskScheduler.getTasks();
    }

    @RequestMapping(value = "/internalapi/tasks/{taskName}", method = RequestMethod.PUT)
    @Secured({"ROLE_ADMIN"})
    public List<TaskInformation> runTask(@PathVariable String taskName) {
        hydraTaskScheduler.runNow(taskName);
        return getTasks();
    }

}
