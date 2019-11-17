"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) {
        return value instanceof P ? value : new P(function (resolve) {
            resolve(value);
        });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            } catch (e) {
                reject(e);
            }
        }

        function rejected(value) {
            try {
                step(generator["throw"](value));
            } catch (e) {
                reject(e);
            }
        }

        function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = {
        label: 0, sent: function () {
            if (t[0] & 1) throw t[1];
            return t[1];
        }, trys: [], ops: []
    }, f, y, t, g;
    return g = {next: verb(0), "throw": verb(1), "return": verb(2)}, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
        return this;
    }), g;

    function verb(n) {
        return function (v) {
            return step([n, v]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {value: op[1], done: false};
                case 5:
                    _.label++;
                    y = op[1];
                    op = [0];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [6, e];
            y = 0;
        } finally {
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {value: op[0] ? op[1] : void 0, done: true};
    }
};
var appG;
var titleRegex = /\[?(Bug|Req\]?):? ?(.*)/gmi;
var IssueType;
(function (IssueType) {
    IssueType["ENHANCEMENT"] = "enhancement";
    IssueType["BUG"] = "bug";
})(IssueType || (IssueType = {}));
function removeIssueTitlePrefix(context, repo, issueNumber, title) {
    var newTitle = title.replace(titleRegex, "$2");
    appG.log('Renaming issue "' + title + '" to  "' + newTitle + '"');
    context.github.issues.update({owner: 'theotherp', repo: repo, number: issueNumber, title: newTitle});
}
function addLabel(context, repoName, issueNumber, label) {
    context.github.issues.addLabels({owner: 'theotherp', repo: repoName, number: issueNumber, labels: [label]});
}
function convertTitleToLabel(context, type) {
    var payload = context.payload;
    var issueTitle = payload.issue.title;
    addLabel(context, payload.repository.name, payload.issue.number, type);
    appG.log('Adding label ' + type + ' to issue with title "' + issueTitle + '"');
    removeIssueTitlePrefix(context, payload.repository.name, payload.issue.number, issueTitle);
}
function checkForDebugInfos(context) {
    return __awaiter(this, void 0, void 0, function () {
        var body, containsDebugInfos, containsZip, issueComment;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    body = context.payload.issue.body;
                    containsDebugInfos = body.toLowerCase().replace(" ", "").indexOf("debuginfos") > -1;
                    containsZip = body.toLowerCase().replace(" ", "").indexOf(".zip") > -1;
                    if (!(!containsDebugInfos && !containsZip)) return [3 /*break*/, 2];
                    appG.log('Issue "' + context.payload.issue.title + '" does not contain any debug infos');
                    issueComment = context.issue({body: 'Thanks for opening this issue. Unfortunately it looks like you forgot to attach your debug infos ZIP.\r\n\r\nSet your log file level to debug, repeat the steps that cause the problem and attach the debug infos ZIP which can be retrieved in the [System / Bugreport section](http://127.0.0.1:5076/system/bugreport).'});
                    return [4 /*yield*/, context.github.issues.createComment(issueComment)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    appG.log("Issue " + context.payload.issue.title + " contains debug infos. Yay!");
                    _a.label = 3;
                case 3:
                    return [2 /*return*/];
            }
        });
    });
}
module.exports = function (app) {
    appG = app;
    appG.log("Running github bot v2");
    app.on('issues.opened', function (context) {
        return __awaiter(void 0, void 0, void 0, function () {
            var issueTitle, regexGroup, issueComment;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        issueTitle = context.payload.issue.title;
                        appG.log('Found issue opened with title "' + issueTitle + '"');
                        regexGroup = titleRegex.exec(issueTitle);
                        if (!(regexGroup != null && regexGroup.length == 3)) return [3 /*break*/, 4];
                        if (!(regexGroup[1].toUpperCase() === "BUG")) return [3 /*break*/, 2];
                        appG.log('Recognized bug with title "' + issueTitle + '"');
                        convertTitleToLabel(context, IssueType.BUG);
                        return [4 /*yield*/, checkForDebugInfos(context)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        appG.log('Recognized enhancement with title "' + issueTitle + '"');
                        convertTitleToLabel(context, IssueType.ENHANCEMENT);
                        _a.label = 3;
                    case 3:
                        return [3 /*break*/, 6];
                    case 4:
                        issueComment = context.issue({body: 'Thanks for opening this issue. Unfortunately it looks like you forgot to prefix the issue title either with BUG (for a bug) or REQ (for a feature request). Please change the title of the issue accordingly.'});
                        return [4 /*yield*/, context.github.issues.createComment(issueComment)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        return [2 /*return*/];
                }
            });
        });
    });
    app.on('issues.edited', function (context) {
        return __awaiter(void 0, void 0, void 0, function () {
            var issue, issueTitle, oldTitle, regexGroup;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        issue = context.payload.issue;
                        issueTitle = issue.title;
                        if (context.payload.sender.type === 'Bot') {
                            appG.log('Ignoring issue edits by Bot');
                            return [2 /*return*/];
                        }
                        appG.log('Issue "' + issueTitle + '" edited by ' + issue.user.login);
                        if (!('title' in context.payload.changes)) return [3 /*break*/, 3];
                        oldTitle = context.payload.changes.title.from;
                        appG.log('Found renamed issue from "' + oldTitle + '" to "' + issueTitle + '"');
                        regexGroup = titleRegex.exec(issueTitle);
                        if (regexGroup == null || regexGroup.length != 3) {
                            appG.log("New title doesn't match expected regex");
                            return [2 /*return*/];
                        }
                        appG.log("Matched group: " + regexGroup[1]);
                        if (!(regexGroup[1].toUpperCase() === "BUG")) return [3 /*break*/, 2];
                        convertTitleToLabel(context, IssueType.BUG);
                        return [4 /*yield*/, checkForDebugInfos(context)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        if (regexGroup[1].toUpperCase() === "REQ") {
                            convertTitleToLabel(context, IssueType.ENHANCEMENT);
                        }
                        _a.label = 3;
                    case 3:
                        return [2 /*return*/];
                }
            });
        });
    });
};
//# sourceMappingURL=index.js.map
