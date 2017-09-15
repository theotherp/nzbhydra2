pyinstaller nzbhydra2wrapper.py -F -n nzbhydra2
chmod +x dist/nzbhydra2
yes | cp -rf dist/nzbhydra2 ../../main/releases/linux-release/include