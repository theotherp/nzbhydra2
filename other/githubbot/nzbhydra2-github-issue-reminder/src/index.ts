import {Application} from 'probot' // eslint-disable-line no-unused-vars

let appG: Application;

enum IssueType {
    ENHANCEMENT = 'enhancement',
    BUG = 'bug'
}

function removeIssueTitlePrefix(context: any, repo: string, issueNumber: number, title: string) {
    let newTitle: string = title.substr(3);

    appG.log("Renaming issue" + title + " to  " + newTitle);
    context.github.issues.update({owner: 'theotherp', repo: repo, number: issueNumber, title: newTitle})
}

function addLabel(context: any, repoName: string, issueNumber: number, label: string) {
    context.github.issues.addLabels({owner: 'theotherp', repo: repoName, number: issueNumber, labels: [label]});
}

function convertTitleToLabel(context: any, type: IssueType) {
    let payload = context.payload;
    let issueTitle: string = payload.issue.title;

    addLabel(context, payload.repository.name, payload.issue.number, type);
    appG.log("Adding label " + type + " to issue with title " + issueTitle);
    removeIssueTitlePrefix(context, payload.repository.name, payload.issue.number, issueTitle);
}

async function checkForDebugInfos(context: any) {
    let body: string = context.payload.issue.body;
    let containsDebugInfos = body.toLowerCase().replace(" ", "").indexOf("debuginfos") > -1;
    let containsZip = body.toLowerCase().replace(" ", "").indexOf(".zip") > -1;
    if (!containsDebugInfos && !containsZip) {
        appG.log("Issue " + context.payload.issue.title + " does not contain any debug infos");
        const issueComment = context.issue({body: 'Thanks for opening this issue. Unfortunately it looks like you forgot to attach your debug infos ZIP.\r\n\r\nSet your log file level to debug, repeat the steps that cause the problem and attach the debug infos ZIP which can be retrieved in the [System / Bugreport section](http://127.0.0.1:5076/system/bugreport).'});
        await context.github.issues.createComment(issueComment)
    } else {
        appG.log("Issue " + context.payload.issue.title + " contains  debug infos. Yay!");
    }
}

export = (app: Application) => {
    appG = app;
    app.on('issues.opened', async (context) => {

        const issueTitle = context.payload.issue.title;
        appG.log('Found issue opened with title ' + issueTitle);
        const issueDescription = context.payload.issue.body;
        const issueNumber = context.payload.issue.number;
        const repoName = context.payload.repository.name;

        if (issueTitle.toLowerCase().startsWith("bug")) {
            appG.log('Recognized bug with ' + issueTitle);
            convertTitleToLabel(context, IssueType.BUG);

        } else if (issueTitle.toLowerCase().startsWith("req")) {
            appG.log('Recognized enhancement with ' + issueTitle);
            convertTitleToLabel(context, IssueType.ENHANCEMENT);

            await checkForDebugInfos(context);
        } else {
            const issueComment = context.issue({body: 'Thanks for opening this issue. Unfortunately it looks like you forgot to prefix the issue title either with BUG (for a bug) or REQ (for a feature request). Please change the title of the issue accordingly.'});
            await context.github.issues.createComment(issueComment)
        }
    });

    app.on('issues.edited', async (context) => {
        let issue = context.payload.issue;
        let issueTitle: string = issue.title;

        if (context.payload.sender.type === 'Bot') {
            appG.log('Ignoring issue edits by Bot');
            return;
        }

        appG.log('Issue ' + issueTitle + ' edited  by ' + issue.user.login);

        if ('title' in context.payload.changes) {
            //User may have added REQ or BUG belatedly

            let oldTitle: string = context.payload.changes.title.from;
            appG.log("Found renamed issue from " + oldTitle + " to " + issueTitle);
            let addedBugToTitle = oldTitle.toLowerCase().indexOf('bug') == -1 && issueTitle.toLowerCase().indexOf('bug') > -1;
            let addedReqToTitle = oldTitle.toLowerCase().indexOf('req') == -1 && issueTitle.toLowerCase().indexOf('req') > -1;
            if (addedBugToTitle) {
                convertTitleToLabel(context, IssueType.BUG);

                await checkForDebugInfos(context);
            } else if (addedReqToTitle) {
                convertTitleToLabel(context, IssueType.ENHANCEMENT);
            }

        }
    });
}