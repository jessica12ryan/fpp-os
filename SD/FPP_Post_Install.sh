systemctl disable fpp-install.service
systemctl daemon-reload
rm -rf /etc/ssh/ssh_host*key*
shutdown -r now
