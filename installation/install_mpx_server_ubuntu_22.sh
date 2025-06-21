#!/bin/bash

###
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#      http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

#=========================================================================================================
# Program: install_mpx_server_ubuntu_22.sh
#
# Ver         Date            Author          Comment    
# =======     ===========     ===========     ==========================================
# V1.0.00     2025-06-10      DW              Install MPX servder for SMS 2.x on Ubuntu 22.04 by using 
#                                             Nginx as web server. Where MPX server is the mail proxy
#                                             sending server for SMS 2.x, which is blocked by it's worker
#                                             mail server.  
#=========================================================================================================

setterm -blank 0

clear

#-- Check whether current user is super user --#
if [[ $EUID > 0 ]]
then
  echo "You must run me by super user, and apparently it is not you!"
  echo ""
  exit 1
fi

#-- Define variables --#
export BUILD_PRELOAD=N
export PATH=$PATH:/usr/local/bin:/usr/sbin:/usr/local/sbin:

#-- Check currently running operating system and it's version --#
v1=`hostnamectl | grep "Ubuntu 22.04" | wc -l`
if [[ "$v1" -eq 0 ]] 
then
  echo "Currently running" `hostnamectl | grep "Operating System"`
  echo ""
  echo "MPX server is not specified for your Linux distro, inatallation on it is likely to fail."
  echo ""
  read -p "Do you want to continue (Y/N)? " TOGO
  if (test ${TOGO} = 'y' || test ${TOGO} = 'Y')
  then
    echo ""
    echo "OK, it is your call, let's go on."
    echo ""
  else
    exit 1
  fi
fi

#-- Check whether MPX server has already been installed. If it is, stop proceed. --#
if [ -d "/www/mailer" ] 
then
  echo "It seems that MPX server has been installed (at least it has been tried to be installed before). Therefore, sub-directory 'mailer' "
  echo "has already existed on directory '/www'."
  echo ""
  echo "If MPX server installation is failure and you need to try again, you have to delete this sub-directory on '/www'"
  echo "manually and re-run installation script 'install_mpx_server_ubuntu_22.sh'."
  echo ""
  echo "Note: Re-run installation script in a production MPX server will damage everything on it."
  echo ""
  read -p "Press enter to exit..."
  exit 1
fi

#-- Start installation process --#
clear
echo "Installation of MPX server is started..."
echo ""
echo "=================================================================================="
echo "Step 1: Install required applications"
echo "=================================================================================="
echo "Refresh software repository..."
#-- Refresh software package repository --#
apt-get update >> /tmp/install.log
echo "Install required system utilities"
apt-get -y install curl gnupg2 net-tools ca-certificates software-properties-common apt-transport-https lsb-release ubuntu-keyring > /tmp/install.log
add-apt-repository -y universe >> /tmp/install.log
apt-get update >> /tmp/install.log
echo "Install and configure internet time utilities"
tm=`dpkg -l | grep systemd-timesyncd | wc -l`
if [[ "$tm" -eq 0 ]]
then
  apt-get -y install systemd-timesyncd > /tmp/install.log
fi  
systemctl enable systemd-timesyncd >> /tmp/install.log
systemctl restart systemd-timesyncd >> /tmp/install.log
hwclock -w
#-- Default time zone is UTC, and I set time zone to Hong Kong (UTC+8). Please change it to your desired --# 
#-- time zone. See this URL for more details: https://linuxhint.com/set-change-timezone-ubuntu-22-04     --#                                                                 
timedatectl set-timezone Asia/Hong_Kong
#-- If firewall is not installed, install and configure it now. Otherwise, just configure it. --#
whatos=`systemd-detect-virt`
if [ "$whatos" != "openvz" ]
then
  #-- Disable default firewall UFW, if it is installed --# 
  fw=`dpkg -l | grep ufw | wc -l`
  if [[ "$fw" -eq 1 ]]
  then
    systemctl disable ufw >> /tmp/install.log
  fi

  fw=`dpkg -l | grep firewalld | wc -l`
  if [[ "$fw" -eq 0 ]]
  then
    echo "Install firewall"
    apt-get -y install firewalld >> /tmp/install.log 
  fi
  #-- Now configure firewall --#
  echo "Configure firewall"
  systemctl enable firewalld >> /tmp/install.log
  systemctl start firewalld >> /tmp/install.log
  firewall-cmd --zone=public --permanent --add-service=ssh
  firewall-cmd --zone=public --permanent --add-service=http
  firewall-cmd --zone=public --permanent --add-service=https
  firewall-cmd --zone=public --permanent --add-icmp-block=echo-request
  firewall-cmd --reload
else
  #-- For OpenVZ host, only UFW Firewall is working. --#
  fw=`dpkg -l | grep ufw | wc -l`
  if [[ "$fw" -eq 0 ]]
  then
    echo "Install firewall"
    apt-get -y install ufw >> /tmp/install.log 
  fi
  #-- Now configure firewall --#
  echo "Configure firewall"
  ufw allow ssh
  ufw allow http
  ufw allow https
  ufw enable
fi  
echo "Install unzip"
apt-get -y install unzip >> /tmp/install.log
echo "Install bzip2"
apt-get -y install bzip2 >> /tmp/install.log
echo "Install development tools"
apt-get -y install build-essential >> /tmp/install.log
echo "Install Perl"
apt-get -y install perl >> /tmp/install.log
echo "Install Git version control system"
apt-get -y install git >> /tmp/install.log
echo "Install OpenSSL"
apt-get -y install openssl >> /tmp/install.log
echo "Install nano"
apt-get -y install nano >> /tmp/install.log

checker=`dpkg -l | grep mariadb-server | wc -l`
if [[ "$checker" -eq 0 ]]
then
  echo "Install MariaDB" 
  apt-get -y install mariadb-server mariadb-client >> /tmp/install.log
  checker=`dpkg -l | grep mariadb-server | wc -l`
  if [[ "$checker" -eq 0 ]]
  then 
    echo "MariaDB server installation is failure, installation is aborted. Error details please"
    echo "refer to the log file /tmp/install.log."
    exit 1;
  fi
fi

echo "Install Nginx web server"
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null
#-- Use mainline Nginx server --#
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] http://nginx.org/packages/mainline/ubuntu `lsb_release -cs` nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list
#-- Set up repository pinning to prefer our packages over distribution-provided ones --#
echo -e "Package: *\nPin: origin nginx.org\nPin: release o=nginx\nPin-Priority: 900\n" \
    | sudo tee /etc/apt/preferences.d/99nginx    
apt-get update >> /tmp/install.log 
apt-get -y install nginx >> /tmp/install.log
checker=`dpkg -l | grep nginx | wc -l`
if [[ "$checker" -eq 0 ]]
then
  echo "Nginx server installation is failure, installation is aborted. Error details please"
  echo "refer to the log file /tmp/install.log."
  exit 1;
else
  echo "Generate a key for Nginx DH exchange. It may take a few minutes, please wait and be patient..."
  openssl dhparam -out /etc/nginx/dhparam.pem 2048 >> /tmp/install.log
  echo "Key generation is completed"
fi

# If Node.js hasn't been installed, install it. If installed Node.js version is too low, upgrade it. 
if [ ! -f "/etc/apt/sources.list.d/nodesource.list" ]
then
  echo "Install Node.js"
  if [ ! -d "/etc/apt/keyrings" ]
  then
    mkdir -p /etc/apt/keyrings >> /tmp/install.log
  fi  
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  #-- Use Node.js 22.x LTS --#
  NODE_MAJOR=22
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
  apt-get update >> /tmp/install.log
  apt-get -y install nodejs >> /tmp/install.log
  checker=`dpkg -l | grep nodejs | wc -l`
  if [[ "$checker" -eq 0 ]]
  then 
    echo "Node.js installation is failure, installation is aborted. Error details please"
    echo "refer to the log file /tmp/install.log."
    exit 1;
  fi
else 
  checker=`dpkg -l | grep nodejs | wc -l`
  if [[ "$checker" -eq 0 ]]
  then 
    if [ ! -d "/etc/apt/keyrings" ]
    then
      mkdir -p /etc/apt/keyrings >> /tmp/install.log
    fi  
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    NODE_MAJOR=22
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list      
    apt-get update >> /tmp/install.log
    apt-get -y install nodejs >> /tmp/install.log
    checker=`dpkg -l | grep nodejs | wc -l`
    if [[ "$checker" -eq 0 ]]
    then 
      echo "Node.js installation is failure, installation is aborted. Error details please"
      echo "refer to the log file /tmp/install.log."
      exit 1;
    fi
  else
    checker=`node -v | cut -d. -f1`
    if [[ "$checker" != "v22" ]] && [[ "$checker" != "v23" ]] && [[ "$checker" != "v24" ]]
    then
      if [ ! -d "/etc/apt/keyrings" ]
      then
        mkdir -p /etc/apt/keyrings >> /tmp/install.log
      fi  
      curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
      NODE_MAJOR=22
      echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list      
      apt-get update >> /tmp/install.log
      apt-get -y upgrade nodejs >> /tmp/install.log
      checker=`dpkg -l | grep nodejs | wc -l`
      if [[ "$checker" -eq 0 ]]
      then 
        echo "Node.js installation is failure, installation is aborted. Error details please"
        echo "refer to the log file /tmp/install.log."
        exit 1;
      fi    
    fi
  fi  
fi

echo "Install SSL certificates issuing and renew utility"
whatos=`systemd-detect-virt`
if [ "$whatos" != "openvz" ]
then
  echo "Refresh snap core"
  snap wait system seed.loaded
  snap install core
  snap refresh core
  snap install --classic certbot >> /tmp/install.log
  ln -s /snap/bin/certbot /usr/bin/certbot
else
  apt-get -y install certbot python3-certbot-nginx >> /tmp/install.log 
fi

echo ""
echo "======================================================================================================"
echo "Step 2: Prepare database server and create databases."
echo "======================================================================================================"
echo "Now, you need to setup administrative account password for the database server."
echo ""
echo "Note: For newly installed MariaDB server, the administrative account password blank, so you"
echo "      just press enter as you are asked for it in next question, and setup your database "
echo "      server administrative passowrd in this stage. However, if the database server has already"
echo "      been setup, you need to input the current administrative passowrd for it."
echo ""
read -p "Press enter to start..."
systemctl enable mariadb.service >> /tmp/install.log
systemctl start mariadb.service >> /tmp/install.log
checker=`systemctl status mariadb | grep "Active: active (running)" | wc -l`
if [[ "$checker" -eq 0 ]] 
then
  echo "Unable to start the MariaDB server, error details please refer to the log file /tmp/install.log"
  exit 1;
else
  mysql_secure_installation
  echo ""
  echo "----------------------------------------------------------------------------------"
  echo "After the database server has been configured, I can now install the required database for you."
  echo "You need to input the database server administrative password in next step."
  echo ""
  read -p "Press enter to start..."
  echo ""
  mysql --user=root -p < ./database/create_db.sql
fi

echo ""
echo "======================================================================================================"
echo "Step 3: Prepare MPX server directories, programs and required libraries."
echo "======================================================================================================"
mkdir -p /www
cp -Rf ./www/* /www
#-- Make all Node.js scripts on directory '/www/mailer' executable --# 
chmod +x /www/mailer/*.js
#-- Install required Node.js libraries --#
echo "Install required Node.js libraries"
dir=`pwd`
cd /www/mailer
npm init -y >> /tmp/install.log
npm install >> /tmp/install.log
cd $dir  

echo ""
echo "======================================================================================================"
echo "Step 4: Configure Nginx as reverse proxy server and install SSL certificate to the site"
echo "======================================================================================================"
echo "You need to input the DNS name of your MPX server on the Nginx configuration file and then generate a "
echo "SSL certificate for it in this stage."
echo ""
echo "Note: Search all the string {your-mpx-server-dns} in the file and replace it with your server domain"
echo "      name, then save it by press keys ^X then Y." 
echo ""
read -p "Press enter to start..."
echo ""
nano ./nginx/ubuntu/mpx-server.conf.template
cp ./nginx/ubuntu/mpx-server.conf.template ./nginx/ubuntu/mpx-server.conf

if [ -f "./nginx/ubuntu/mpx-server.conf" ]
then
  cp -f ./nginx/ubuntu/mpx-server.conf /etc/nginx/conf.d >> /tmp/install.log
  cp -f ./nginx/ubuntu/ssl_cert_and_key/cert/* /etc/ssl/certs >> /tmp/install.log
  cp -f ./nginx/ubuntu/ssl_cert_and_key/key/* /etc/ssl/private >> /tmp/install.log
else
  echo "Nginx configuration file of MPX Server is missing, process is aborted."
  exit 1
fi

#-- Hide Nginx server version --#
ngxcfgfile="/etc/nginx/nginx.conf"

checker=`cat $ngxcfgfile | grep server_tokens | wc -l`
if [ "$checker" -eq 0 ]
then
  echo "Add server_tokens setting to $ngxcfgfile." >> /tmp/install.log
  match=`cat $ngxcfgfile | grep "gzip"`
  insert="    server_tokens off;"
  
  sed -i "s/$match/$match\n$insert/" $ngxcfgfile
else
  c2=`cat $ngxcfgfile | grep server_tokens | grep on | wc -l`
  if [ "$c2" -eq 1 ]
  then
    echo "server_tokens is on, turn it off now." >> /tmp/install.log
    match=`cat $ngxcfgfile | grep server_tokens`
    replace="    server_tokens off;"
    
    sed -i "s/$match/$replace/" $ngxcfgfile
  else
    echo "Everything on $ngxcfgfile is fine, no need to change." >> /tmp/install.log 
  fi  
fi

systemctl enable nginx.service >> /tmp/install.log
systemctl start nginx.service >> /tmp/install.log
checker=`systemctl status nginx | grep "Active: active (running)" | wc -l`
if [[ "$checker" -eq 0 ]] 
then
  echo "Nginx server can't be started, installation is aborted. Error details please"
  echo "refer to the log file /tmp/install.log."
  exit 1;
fi
#-- Note: 1. Nginx must be up and running before execute 'certbot'.                                                         --#
#--       2. SSL certificate getting process often fail in this stage. If it is the case, just login as root and re-run the --#
#--          below command.                                                                                                 --# 
certbot --nginx
y=`cat /etc/nginx/conf.d/mpx-server.conf | grep "letsencrypt" | wc -l`
if [[ "$y" -eq 0 ]]
then
  echo ""
  echo "******************************************************************************"
  echo "SSL certificate generation process is failure, but don't worry, you may re-run"
  echo "the following command after MPX server installation to fix this problem:"
  echo ""
  echo "certbot --nginx"
  echo "******************************************************************************"
  echo ""
  read -p "Press enter to continue..."
fi  

echo ""
echo "======================================================================================================"
echo "Step 5: Install MPX application server automatic starting script"
echo "======================================================================================================"
echo ""
#-- create PM2 control script here --#
dir=`pwd`
npm install -g pm2 >> /tmp/loc_install.log
pm2_ver=`pm2 -v`
if [ -z $pm2_ver ] 
then
  echo "Process manager PM2 is installed failure, process is aborted. Error details please"
  echo "refer to log file /tmp/install.log"
  exit 1
else
  echo "PM2 $pm2_ver is installed successfully."  
fi   

if [ -f "./sys/pm2-mpx-server.json" ]
then
  dir=`pwd`
  cp -f ./sys/pm2-mpx-server.json /www/mailer >> /tmp/install.log
  cd /www/mailer
    
  #-- Start MPX server instances and other related processes --#
  pm2 start /www/sms2/pm2-mpx-server.json 
  pm2 startup systemd -u root
  pm2 save  
  
  #-- Check whether MPX server instance(s) is/are running. If it is not, show warning --#
  #-- message.                                                                                        --#
  checker=`ps ax | grep "node /www/mailer/mail-worker.js" | grep -v "\-\-color=auto" | wc -l`
  if [[ "$checker" -eq 0 ]]
  then
    echo ""
    echo "Warning: MPX server instance seems not starting, please check PM2 log files on"
    echo "         directory /root/.pm2/logs."
    echo ""
    read -p "Press the Enter to continue..."
  else
    #-- This file is used only once. When PM2 starting configuration is done, it can be deleted. --#
    rm -f /www/sms2/pm2-mpx-server.json   
  fi       
  
  cd $dir
else
  echo "PM2 configuration file is missing, process is aborted. Please refer the log file /tmp/install.log to find"
  echo "what is wrong."
  exit 1
fi

echo ""
echo "=================================================================================="
echo "Step 6: Configure Linux system settings"
echo "=================================================================================="
echo "Configure system log rotation"
echo ""
cp -f ./sys/ubuntu/rsyslog /etc/logrotate.d >> /tmp/install.log
cp -f ./sys/ubuntu/nginx /etc/logrotate.d >> /tmp/install.log
cp -f ./sys/ubuntu/pm2log /etc/logrotate.d >> /tmp/install.log
checker=`cat /etc/crontab | grep "root certbot renew" | wc -l` 
if [[ "$checker" -eq 0 ]]
then
  if [ ! -f "/etc/crontab.mpx.bkup" ]
  then  
    cp -f /etc/crontab /etc/crontab.mpx.bkup >> /tmp/install.log
  fi
    
  echo "Add SSL certificate renewal job to scheduler"
  echo ""
  echo "# Renew SSL certificate" >> /etc/crontab
  echo "0 0,12 * * * root certbot renew" >> /etc/crontab
fi
systemctl restart cron
#-- Disable GUI on boot --#
systemctl set-default multi-user
  
echo ""
echo "=================================================================================="
echo "Finalize installation"
echo "=================================================================================="
echo "MPX server has been installed successfully." 
echo ""
echo "Now, the server is needed to reboot to complete the installation process."
echo ""
read -p "Press the enter to reboot..."
shutdown -r now
