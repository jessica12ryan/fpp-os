systemctl disable fpp-install.service
rm -f /etc/systemd/system/fpp-install.service
systemctl daemon-reload
apt-get install systemd-timesyncd -y
systemctl enable --now systemd-timesyncd
rm -rf /etc/ssh/ssh_host*key*
rm -f "$0"
shutdown -r now
