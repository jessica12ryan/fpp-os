import os
import sys
import platform
import subprocess
import urllib.request

def get_vboxmanage_cmd():
    """Locates the VBoxManage executable based on the operating system."""
    os_type = platform.system().lower()
    if "windows" in os_type:
        return r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
    elif "darwin" in os_type or "linux" in os_type:
        return "VBoxManage"
    else:
        print(f"Unsupported Operating System: {platform.system()}")
        sys.exit(1)

def get_active_bridge_interface(vbox_cmd):
    """Dynamically detects the host's active internet adapter to use for bridging."""
    os_type = platform.system().lower()
    active_iface = ""

    try:
        if "darwin" in os_type:
            # macOS active interface discovery
            route_out = subprocess.check_output("route -n get default", shell=True).decode()
            for line in route_out.splitlines():
                if "interface:" in line:
                    active_iface = line.split()[-1].strip()
        elif "linux" in os_type:
            # Linux active interface discovery
            route_out = subprocess.check_output("ip route", shell=True).decode()
            for line in route_out.splitlines():
                if line.startswith("default"):
                    active_iface = line.split()[4].strip()
                    break
        elif "windows" in os_type:
            # Windows active interface discovery via PowerShell
            ps_cmd = "Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -ExpandProperty InterfaceAlias"
            active_iface = subprocess.check_output(["powershell", "-Command", ps_cmd]).decode().strip()

        # Match active interface name against VirtualBox's internal network naming string
        vbox_ifs = subprocess.check_output([vbox_cmd, "list", "bridgedifs"]).decode()
        for block in vbox_ifs.split("\n\n"):
            if active_iface in block:
                for line in block.splitlines():
                    if line.startswith("Name:"):
                        return line.replace("Name:", "").strip()

        # Fallback safety: grab the first available bridged interface VirtualBox sees
        for line in vbox_ifs.splitlines():
            if line.startswith("Name:"):
                return line.replace("Name:", "").strip()
    except Exception:
        pass
    
    return "Ethernet" # Safe hardcoded default string fallback

def run_vbox_cmd(cmd_list):
    """Executes VBoxManage commands safely and prints errors if they fail."""
    result = subprocess.run(cmd_list, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"VirtualBox Error: {result.stderr.strip()}")
        sys.exit(1)

def main():
    vbox_cmd = get_vboxmanage_cmd()

    # 1. Interactive Prompts
    vm_name = input("Enter VM Name [FPP]: ") or "FPP"
    
    try:
        ram_mb = input("Enter RAM in MB (e.g., 2048): ")
        disk_gb = int(input("Enter Disk size in GB (e.g., 16, 32, 64): "))
    except ValueError:
        print("Invalid number entered. Exiting.")
        sys.exit(1)

    # Convert Disk GB to MB
    disk_size_mb = str(disk_gb * 1024)

    # Static Configurations
    os_type = "Debian_64"
    vram_mb = "32"
    iso_url = "https://github.com/jessica12ryan/fpp-os/releases/latest/download/fpp-os-amd64.iso"
    
    # Resolves paths correctly on Windows (C:\Users\...) and Mac/Linux (/Users/...)
    iso_path = os.path.expanduser(os.path.join("~", "Downloads", "fpp-os-amd64.iso"))

    # 2. Download the ISO (Always Overwrites)
    print("Downloading ISO from web...")
    try:
        urllib.request.urlretrieve(iso_url, iso_path)
    except Exception as e:
        print(f"Download failed: {e}")
        sys.exit(1)

    # 3. Detect Bridge Network Adapter
    vbox_bridge_name = get_active_bridge_interface(vbox_cmd)
    print(f"Automatically bridging to host adapter: {vbox_bridge_name}")

    # 4. Create and Register VM
    run_vbox_cmd([vbox_cmd, "createvm", "--name", vm_name, "--ostype", os_type, "--register"])

    # 5. Set Hardware Configurations
    run_vbox_cmd([
        vbox_cmd, "modifyvm", vm_name,
        "--memory", ram_mb,
        "--vram", vram_mb,
        "--graphicscontroller", "vmsvga",
        "--ioapic", "on",
        "--boot1", "dvd",
        "--nic1", "bridged",
        "--bridgeadapter1", vbox_bridge_name,
        "--firmware", "efi",
        "--usbohci", "on",
        "--usbehci", "on"
    ])

    # 6. Create Virtual Disk (Stored relative to where you run the script)
    vdi_path = os.path.abspath(f"{vm_name}.vdi")
    run_vbox_cmd([vbox_cmd, "createmedium", "disk", "--filename", vdi_path, "--size", disk_size_mb, "--format", "VDI"])

    # 7. Add Storage Controllers
    run_vbox_cmd([vbox_cmd, "storagectl", vm_name, "--name", "IDE", "--add", "ide"])
    run_vbox_cmd([vbox_cmd, "storagectl", vm_name, "--name", "SATA", "--add", "sata", "--controller", "IntelAhci", "--portcount", "1"])

    # 8. Attach Media
    run_vbox_cmd([vbox_cmd, "storageattach", vm_name, "--storagectl", "IDE", "--port", "0", "--device", "0", "--type", "dvddrive", "--medium", iso_path])
    run_vbox_cmd([vbox_cmd, "storageattach", vm_name, "--storagectl", "SATA", "--port", "0", "--device", "0", "--type", "hdd", "--medium", vdi_path])

    # 9. Launch the VM
    print(f"Starting virtual machine '{vm_name}'...")
    run_vbox_cmd([vbox_cmd, "startvm", vm_name])

if __name__ == "__main__":
    main()