systemctl disable fpp-install.service
rm -rf /etc/ssh/ssh_host*key*
rm -f "$0"
shutdown -r now
