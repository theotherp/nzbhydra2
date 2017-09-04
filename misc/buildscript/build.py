# Update poms from snapshot to release version
# Run maven clean install
# Add / update git tag
# push to repo (to update tag)
# create github release as draft
# attach assets to new github release
# toggle draft status of release
# update poms to next version
# commit changes (with new version in poms)
import argparse
import json
import os
import requests
import subprocess
import sys

# current_version = "1.0.0-SNAPSHOT"
# release_version = current_version.replace("-SNAPSHOT", "")
# new_version = "1.0.1-SNAPSHOT"
# # base_folder = r"C:\Users\strat\IdeaProjects\NzbHydra2"
# mvn_bin = r"C:\Program Files\JetBrains\IntelliJ IDEA 2017.1.3\plugins\maven\lib\maven3\bin\mvn.cmd"
# java_home = r"c:\Program Files\Java\jdk1.8.0_131"
# changelog_json = r"C:\Users\strat\IdeaProjects\NzbHydra2\changelog.json"
# changelog_md = r"c:\temp\nzbhydra2-build-test\changelog.md"
# # base_url = "https://api.github.com"
# base_url = "http://127.0.0.1:5080"
# windows_asset_folder = r"c:\temp\nzbhydra2-build-test\windows-release\target"
# linux_asset_folder = r"c:\temp\nzbhydra2-build-test\linux-release\target"
# base_folder = r"c:\temp\nzbhydra2-build-test"
from pygit2 import init_repository


class AbortBuildException(Exception):
    def __init__(self, value):
        self.message = value


def generate_changelog(changelog_json, changelog_md):
    with open(changelog_json, "r") as f:
        changelog = json.load(f)
    content = ""
    for entry in reversed(changelog):
        entry_content = get_md_from_entry(entry)
        content += entry_content

    with open(changelog_md, "w") as f:
        f.write(content)


def get_md_from_entry(entry, with_headline=True):
    entry_content = ""
    if with_headline:
        entry_content += "###" + entry["version"] + "\n"
    for change in entry["changes"]:
        type = change["type"]
        if change["type"] == "note":
            type = "Note"
        entry_content += type + ": " + change["text"] + "\n"
        if change["type"] == "feature":
            type = "Feature"
        entry_content += type + ": " + change["text"] + "\n"
        if change["type"] == "fix":
            type = "Fix"
        entry_content += type + ": " + change["text"] + "\n"
    return entry_content


def update_poms(search, replace, base_folder):
    print("Will update POMs from version " + search + " to " + replace)
    for dname, dirs, files in os.walk(base_folder):
        for fname in files:
            if fname == "pom.xml":
                fpath = os.path.join(dname, fname)
                with open(fpath, "r") as f:
                    s = f.read()
                if search in s:
                    print("Updating " + fpath)
                else:
                    continue
                s = s.replace(search, replace)
                with open(fpath, "w") as f:
                    f.write(s)


def commit_state(basefolder, release_version, message=None):
    stats = init_repository(basefolder).diff().stats
    if stats.files_changed > 0:
        if message is None:
            message = 'Prepare release of v' + release_version
        process = subprocess.Popen(["git", "commit", "-am", message], cwd=basefolder, shell=True, stdout=subprocess.PIPE)
        print(process.communicate()[0])
        if process.returncode is not None and process.returncode != 0:
            sys.exit(1)
    else:
        print("No changes")


def push(basefolder):
    print("Pushing to origin")
    process = subprocess.Popen(["git", "push"], cwd=basefolder, shell=True, stdout=subprocess.PIPE)
    print(process.communicate()[0])
    if process.returncode is not None and process.returncode != 0:
        sys.exit(1)


def create_release(release_version, changelog_json, base_url):
    version = release_version
    if not release_version.startswith("v"):
        version = "v" + release_version
    print("Creating release")
    with open(changelog_json, "r") as f:
        changelog = json.load(f)
    last_entry = changelog[len(changelog) - 1]
    last_entry_md = get_md_from_entry(last_entry, False)

    token = os.environ.get("TOKEN")
    data = {"tag_name": version, "target_commitish": "master", "name": release_version, "body": last_entry_md, "draft": True, "prerelease": False}
    r = requests.post(base_url + "/repos/theotherp/nzbhydra2/releases?access_token=" + token, data=json.dumps(data))
    r.raise_for_status()
    return r.json()


def set_release_public(release, base_url):
    print("Setting release public")
    token = os.environ.get("TOKEN")
    release["draft"] = True
    r = requests.post(base_url + "/repos/theotherp/nzbhydra2/releases?access_token=" + token, data=json.dumps(release))
    r.raise_for_status()
    return r.json()


def upload_assets(release, windows_asset_folder, linux_asset_folder):
    upload_url = release["upload_url"].replace("{?name,label}", "")

    content_type = "application/zip"

    onlyfiles = [f for f in os.listdir(windows_asset_folder) if os.path.isfile(os.path.join(windows_asset_folder, f))]
    if len(onlyfiles) != 1:
        raise AbortBuildException("Not exactly one file found in " + windows_asset_folder)
    windows_asset = os.path.join(windows_asset_folder, onlyfiles[0])
    name = os.path.basename(windows_asset)
    with open(windows_asset, "rb") as f:
        data = f.read()
    print("Uploading windows asset")
    requests.post(upload_url + "?name=" + name, data=data, headers={"Content-Type": content_type})

    onlyfiles = [f for f in os.listdir(linux_asset_folder) if os.path.isfile(os.path.join(linux_asset_folder, f))]
    if len(onlyfiles) != 1:
        raise AbortBuildException("Not exactly one file found in " + linux_asset_folder)
    linux_asset = os.path.join(linux_asset_folder, onlyfiles[0])
    content_type = "application/gzip"
    name = os.path.basename(linux_asset)
    with open(linux_asset, "rb") as f:
        data = f.read()
    print("Uploading linux asset")
    requests.post(upload_url + "?name=" + name, data=data, headers={"Content-Type": content_type})


if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='NZBHydra2 build scripts')
    parser.add_argument('--action', action='store')
    parser.add_argument('--basefolder', action='store')
    parser.add_argument('--baseurl', action='store')
    parser.add_argument('--currentversion', action='store')
    parser.add_argument('--releaseversion', action='store')
    parser.add_argument('--newversion', action='store')
    parser.add_argument('--changelogjson', action='store')
    parser.add_argument('--changelogmd', action='store')
    parser.add_argument('--windowsassetfolder', action='store')
    parser.add_argument('--linuxassetfolder', action='store')

    args, unknown = parser.parse_known_args()

    try:
        if args.action == "genchangelog":
            generate_changelog(args.changelogjson, args.changelogmd)
        if args.action == "updatepoms":
            update_poms(args.currentversion, args.releaseversion, args.basefolder)
        if args.action == "commitrelease":
            commit_state(args.basefolder, args.releaseversion)
        if args.action == "push":
            push(args.basefolder)
        if args.action == "release":
            release = create_release(args.releaseversion, args.changelogjson, args.baseurl)
            upload_assets(release, args.windowsassetfolder, args.linuxassetfolder)
            set_release_public(release, args.baseurl)
    except (AbortBuildException, ValueError) as e:
        print(e.message)
        print("Build aborted")
        sys.exit(1)
