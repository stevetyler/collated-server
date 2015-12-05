# collated-server

Ubuntu 14.04

Bcrypt install failed initially and need to update GCC: http://askubuntu.com/questions/466651/how-do-i-use-the-latest-gcc-4-9-on-ubuntu-14-04

-sudo add-apt-repository ppa:ubuntu-toolchain-r/test
-sudo apt-get update
-sudo apt-get install gcc-4.9 g++-4.9
-sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.9 60 --slave /usr/bin/g++ g++ /usr/bin/g++-4.9

Then run:

-sudo npm i -g node-gyp && node-gyp clean
-npm install bcrypt --save





