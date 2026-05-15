systemctl disable fpp-install.service
systemctl daemon-reload
apt-get install systemd-timesyncd -y
systemctl enable --now systemd-timesyncd
rm -rf /etc/ssh/ssh_host*key*
shutdown -r now
