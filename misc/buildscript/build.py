# Update poms from snapshot to release version
# Run maven clean install
# Add / update git tag
# push to repo (to update tag)
# create github release as draft
# attach assets to new github release
# toggle draft status of release
# update poms to next version
# commit changes (with new version in poms)
import json
import os
import requests
import subprocess
import sys
from git import Repo

current_version = "1.0.0-SNAPSHOT"
release_version = current_version.replace("-SNAPSHOT", "")
new_version = "1.0.1-SNAPSHOT"
# base_folder = r"C:\Users\strat\IdeaProjects\NzbHydra2"
mvn_bin = r"C:\Program Files\JetBrains\IntelliJ IDEA 2017.1.3\plugins\maven\lib\maven3\bin\mvn.cmd"
java_home = r"c:\Program Files\Java\jdk1.8.0_131"
changelog_json = r"C:\Users\strat\IdeaProjects\NzbHydra2\changelog.json"
changelog_md = r"c:\temp\nzbhydra2-build-test\changelog.md"
# base_url = "https://api.github.com"
base_url = "http://127.0.0.1:5080"
windows_asset_folder = r"c:\temp\nzbhydra2-build-test\windows-release\target"
linux_asset_folder = r"c:\temp\nzbhydra2-build-test\linux-release\target"

base_folder = r"c:\temp\nzbhydra2-build-test"

repo = Repo(base_folder)


class AbortBuildException(Exception):
    def __init__(self, value):
        self.message = value


def generate_changelog():
    print("Generating changelog")
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


def update_poms(search, replace):
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


def run_tests():
    print("Running maven tests")
    process = subprocess.Popen([mvn_bin, "test"], shell=True, stdout=subprocess.PIPE, cwd=base_folder, env={"JAVA_HOME": java_home})
    for line in iter(process.stdout.readline, ''):
        sys.stdout.write(line)
    if process.returncode is not None and process.returncode != 0:
        raise AbortBuildException("Maven tests failed")


def run_install():
    print("Running maven install")
    process = subprocess.Popen([mvn_bin, "clean", "install", "-DskipTests=false", ">", "mvn.log"], shell=True, stdout=subprocess.PIPE, cwd=base_folder, env={"JAVA_HOME": java_home})
    process.wait()

    if process.returncode is not None and process.returncode != 0:
        raise AbortBuildException("Maven install failed")


def commit_state():
    print("Committing current state")
    index = repo.index
    index.add("*")
    if len(index.diff()) > 0:
        index.commit('Update to version ' + release_version + '')
    else:
        print("Nothing to commit")


def push():
    print("Pushing to origin")
    repo.remote("origin").push()


def create_release():
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


def set_release_public(release):
    token = os.environ.get("TOKEN")
    release["draft"] = True
    r = requests.post(base_url + "/repos/theotherp/nzbhydra2/releases?access_token=" + token, data=json.dumps(release))
    r.raise_for_status()
    return r.json()


def upload_assets(release):
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

    search = current_version
    replace = release_version
    try:
        generate_changelog()
        update_poms(search, replace)
        run_install()
        commit_state()
        # push()
        release = create_release()
        upload_assets(release)
        set_release_public(release)

    except (AbortBuildException, ValueError) as e:
        print(e.message)
        print("Build aborted")
        repo.index.reset()
