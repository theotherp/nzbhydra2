# Windows VM Setup for GraalVM Native Builds

This document describes how to set up a headless Windows VM on Linux for building Windows native executables using GraalVM.

## Why This Is Needed

GraalVM native-image doesn't support cross-compilation. To build Windows executables from Linux, you need a Windows environment. A headless VM with SSH access provides CLI-controllable builds.

## Prerequisites

- Linux host with KVM support (`grep -E 'vmx|svm' /proc/cpuinfo`)
- Windows ISO (Windows 10/11)
- VirtIO drivers ISO: https://fedorapeople.org/groups/virt/virtio-win/direct-downloads/stable-virtio/

## Step 1: Install QEMU/KVM

### Ubuntu/Debian

```bash
sudo apt install qemu-kvm libvirt-daemon-system virtinst virt-manager
sudo usermod -aG libvirt,kvm $USER
# Log out and back in for group changes
```

### Fedora

```bash
sudo dnf install @virtualization
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER
```

### Arch

```bash
sudo pacman -S qemu-full libvirt virt-manager dnsmasq
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER
```

## Step 2: Create Windows VM

```bash
# Create directory for VMs
mkdir -p ~/vms

# Create disk image (60GB, grows dynamically)
qemu-img create -f qcow2 ~/vms/windows-build.qcow2 60G

# Start installation
virt-install \
  --name windows-build \
  --ram 8192 \
  --vcpus 4 \
  --disk path=~/vms/windows-build.qcow2,format=qcow2,bus=virtio \
  --cdrom /path/to/windows.iso \
  --disk path=/path/to/virtio-win.iso,device=cdrom \
  --os-variant win11 \
  --network network=default,model=virtio \
  --graphics spice
```

This opens a graphical installer. Complete the Windows installation.

**During installation**: Load VirtIO drivers from the second CD-ROM when Windows can't find the disk.

## Step 3: Windows VM Configuration

After Windows is installed, perform these steps inside the VM:

### Install VirtIO Drivers

- Open Device Manager
- Update any devices with missing drivers using the VirtIO CD-ROM

### Install OpenSSH Server

Open PowerShell as Administrator:

```powershell
# Install OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# Start and enable the service
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

# Configure firewall (usually automatic)
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### Install Build Tools

1. **GraalVM Community Edition**
    - Download from https://github.com/graalvm/graalvm-ce-builds/releases
    - Extract to `C:\Program Files\graalvm`
    - Set `JAVA_HOME` and add to `PATH`

2. **Visual Studio Build Tools**
    - Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/
    - Install "Desktop development with C++" workload
    - Required for native-image on Windows

3. **Maven**
    - Download from https://maven.apache.org/download.cgi
    - Extract and add `bin` to `PATH`

4. **Git** (optional, if syncing via git instead of rsync)
    - Download from https://git-scm.com/download/win

### Configure Static IP (Recommended)

In Windows Network Settings, set a static IP like `192.168.122.100` to make SSH scripting easier.

### Set Up SSH Key Authentication

From your Linux host:

```bash
ssh-copy-id builder@192.168.122.100
```

## Step 4: VM Management Commands

```bash
# Start VM (headless)
virsh start windows-build

# Check running VMs
virsh list

# Get VM IP address
virsh domifaddr windows-build

# Shutdown gracefully
virsh shutdown windows-build

# Force stop
virsh destroy windows-build

# Create snapshot (recommended after setup)
virsh snapshot-create-as windows-build clean-setup "Fresh install with build tools"

# Restore snapshot
virsh snapshot-revert windows-build clean-setup
```

## Step 5: Build Script

Create `build-windows.sh` in the project root:

```bash
#!/bin/bash
set -e

VM_NAME="windows-build"
WIN_USER="builder"
WIN_HOST="192.168.122.100"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="C:\\Users\\$WIN_USER\\nzbhydra2"

echo "=== Windows Native Build ==="

# Start VM if not running
if ! virsh list --name | grep -q "^${VM_NAME}$"; then
    echo "Starting Windows VM..."
    virsh start "$VM_NAME"
    echo "Waiting for VM to boot..."
    sleep 60
fi

# Wait for SSH to be available
echo "Waiting for SSH..."
until ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$WIN_USER@$WIN_HOST" "echo ready" 2>/dev/null; do
    sleep 5
done
echo "SSH is ready"

# Sync source code
echo "Syncing source code..."
rsync -avz --delete \
    --exclude 'target/' \
    --exclude '.git/' \
    --exclude '.idea/' \
    --exclude '*.iml' \
    "$PROJECT_DIR/" \
    "$WIN_USER@$WIN_HOST:nzbhydra2/"

# Run build
echo "Running build..."
ssh "$WIN_USER@$WIN_HOST" "cd nzbhydra2 && cmd /c buildCore.cmd"

# Copy artifact back
echo "Copying artifact..."
mkdir -p "$PROJECT_DIR/core/target"
scp "$WIN_USER@$WIN_HOST:nzbhydra2/core/target/core.exe" \
    "$PROJECT_DIR/core/target/core-windows.exe"

echo "=== Build complete: core/target/core-windows.exe ==="

# Uncomment to shutdown VM after build:
# virsh shutdown "$VM_NAME"
```

Make it executable:

```bash
chmod +x build-windows.sh
```

## Usage

```bash
# One command to build Windows executable
./build-windows.sh
```

## Troubleshooting

### VM won't start

```bash
# Check for errors
virsh start windows-build 2>&1

# Check libvirt logs
sudo journalctl -u libvirtd
```

### Can't connect via SSH

```bash
# Check VM is running
virsh list

# Get IP address
virsh domifaddr windows-build

# Check if SSH port is open
nc -zv 192.168.122.100 22
```

### Build fails

SSH into the VM and run the build manually to see full output:

```bash
ssh builder@192.168.122.100
cd nzbhydra2
cmd /c buildCore.cmd
```

### Performance issues

- Ensure KVM is enabled: `lsmod | grep kvm`
- Increase RAM/CPU in VM settings
- Use VirtIO drivers for disk and network

## Notes

- The Windows VM requires a valid Windows license
- First boot after shutdown takes longer (Windows updates, etc.)
- Consider keeping the VM running during development sessions
- Snapshot the VM after successful setup to enable easy recovery
