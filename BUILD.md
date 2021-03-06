The BitBox Wallet supports building on X86_64 machines. Building on 32bit
systems is may be possible but it is explicitly unsupported. The following
platforms should be viable for development, building, and use of the BitBox
Wallet application.

* Debian GNU/Linux: Stretch and Buster
* Ubuntu: 14.04, 16.04, 17.10, and 18.04
* Fedora: 26, 27, 28, and 29
* MacOS: 10.13
* Windows: Windows 7, Windows 10

## Debian, Ubuntu, and Fedora GNU/Linux with Docker

Install [Docker]
(https://docs.docker.com/install/linux/docker-ce/):

Initalize the Docker image:
`make dockerinit`

Enter the Docker environment:
`make dockerdev`

Within the Docker dev environment, build the QT frontend:
`make qt-linux`

Build artifacts:
* `frontends/qt/build/linux/bitbox-4.0.0-1.x86_64.rpm`
* `frontends/qt/build/linux/bitbox_4.0.0_amd64.deb`
* `frontends/qt/build/linux/BitBox-x86_64.AppImage`

## MacOS

Prepare the MacOS system to have the build environment:
`make osx-init`

Build the QT frontend for MacOS:
`make qt-osx`

Build artifacts:
* `frontends/qt/build/osx/BitBox.app`

## Windows

The exact steps to build are documented in `appveyor.yml` and there is no
automated Windows build environment setup Makefile target. The Windows build
process is currently a work in progress. The build requires `mingw-w64`,
`bash`, `make`, `Microsoft Visual Studio 2017`, `go 1.10`, `yarn`, `QT 5.11.1`
and possibly other tools. 

Build the QT frontend for Windows:
```
cd frontends/qt/server/
make -f Makefile.windows windows-legacy
cd .. && mkdir build && cd build
qmake ..\BitBox.pro
nmake
cd .. && bash windows_post.sh
```

Build artifacts:
* `frontends\qt\build\windows\*`

## Cross compile from GNU/Linux to Windows
It is not currently possible to cross compile the BitBox wallet for Windows.
The `qtwebwidgets` QT module only supports native building on Windows. It is
possible to cross compile `libserver.so` library for Windows from GNU/Linux.

Enter the Docker environment:
`make dockerdev`

Cross compile the library:
`cd frontends/qt/server/ && make windows-cross`

Build artifacts:
* `frontends/qt/server/libserver.dll`
* `frontends/qt/server/libserver.h`
