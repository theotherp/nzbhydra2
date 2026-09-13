#!/bin/bash
set -e
# One-time setup of a fresh Oracle Cloud Ampere A1 (arm64) Ubuntu VM as the arm64 build host.
# Run locally from the project main folder after filling in remote.env:
#   misc/buildLinuxCore/arm64/setupOracleVm.sh
# It connects as REMOTE_ADMIN_USER (the cloud image's default user), installs docker and rsync,
# creates REMOTE_USER with docker access and passwordless sudo and copies the ssh key over.
# Afterwards buildLinuxCore.sh syncs the repo and builds; the docker image is built on first use.

if [[ ! -d "${PWD}/core" ]] ; then
  echo "${PWD}/core not found - you must be in the project main folder"
  exit 1
fi
source "${PWD}/misc/buildLinuxCore/arm64/remote.sh"

${REMOTE_SSH} "${REMOTE_ADMIN_USER}@${REMOTE_HOST}" "BUILD_USER=${REMOTE_USER} bash -s" <<'REMOTE_SCRIPT'
set -e
if [[ "$(uname -m)" != "aarch64" ]]; then
  echo "This is not an arm64 machine ($(uname -m)) - pick the VM.Standard.A1.Flex shape" >&2
  exit 1
fi

echo "Installing docker and rsync"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q docker.io rsync
sudo systemctl enable --now docker

echo "Creating user ${BUILD_USER}"
if ! id "${BUILD_USER}" >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash "${BUILD_USER}"
fi
sudo usermod -aG docker "${BUILD_USER}"
# runOnRemoteMachine.sh uses sudo rm on the maven cache
echo "${BUILD_USER} ALL=(ALL) NOPASSWD:ALL" | sudo tee "/etc/sudoers.d/${BUILD_USER}" >/dev/null
sudo chmod 440 "/etc/sudoers.d/${BUILD_USER}"

echo "Copying ssh key of $USER to ${BUILD_USER}"
sudo mkdir -p "/home/${BUILD_USER}/.ssh"
sudo cp ~/.ssh/authorized_keys "/home/${BUILD_USER}/.ssh/authorized_keys"
sudo chown -R "${BUILD_USER}:${BUILD_USER}" "/home/${BUILD_USER}/.ssh"
sudo chmod 700 "/home/${BUILD_USER}/.ssh"
sudo chmod 600 "/home/${BUILD_USER}/.ssh/authorized_keys"
sudo -u "${BUILD_USER}" mkdir -p "/home/${BUILD_USER}/nzbhydra2" "/home/${BUILD_USER}/.m2/repository"
echo "VM setup done"
REMOTE_SCRIPT

echo "Checking login as ${REMOTE_USER}"
${REMOTE_SSH} "${REMOTE_USER}@${REMOTE_HOST}" 'docker version --format "docker {{.Server.Version}} ok"'
echo "Now run misc/buildLinuxCore/arm64/buildLinuxCore.sh"
