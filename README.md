# Betaflight Configurator

![Betaflight](http://static.rcgroups.net/forums/attachments/6/1/0/3/7/6/a9088900-228-bf_logo.jpg)

[![Latest version](https://img.shields.io/github/v/release/betaflight/betaflight-configurator)](https://github.com/betaflight/betaflight-configurator/releases) [![Build](https://img.shields.io/github/actions/workflow/status/betaflight/betaflight-configurator/nightly.yml?branch=master)](https://github.com/betaflight/betaflight-configurator/actions/workflows/nightly.yml) [![Crowdin](https://d322cqt584bo4o.cloudfront.net/betaflight-configurator/localized.svg)](https://crowdin.com/project/betaflight-configurator) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=betaflight_betaflight-configurator&metric=alert_status)](https://sonarcloud.io/dashboard?id=betaflight_betaflight-configurator) [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)


Betaflight Configurator is a crossplatform configuration tool for the Betaflight flight control system.

It runs as an application under different operating systems and allows you to configure the Betaflight software running on any supported Betaflight target. [Downloads are available in Releases.](https://github.com/betaflight/betaflight-configurator/releases)

Various types of aircraft are supported by the tool and by Betaflight, e.g. quadcopters, hexacopters, octocopters and fixed-wing aircraft.

## tblaha: How to run on Ubuntu 22.04

Install the `yarn` package manager via the `npm` package manager, which is in turn installed via the `apt` package manager (...). Also install the correct version of `node` (v16):
```bash
sudo apt install libatomic1 npm
sudo npm install -g gulp-cli yarn
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
```

Clone repo, install dependencies and then compile:
```bash
git clone git@github.com/tblaha/betaflight-configurator
cd betaflight-configurator
git checkout 10.10-pi
yarn install # this installs the dependency node modules
yarn gulp debug # the builds the application using the debug profile and downloads the NWjs
```

In the future, you can run with either `yarn gulp debug` or with `./debug/betaflight-configurator/linux64/betaflight-configurator`.



## Authors

Betaflight Configurator is a [fork](#credits) of the Cleanflight Configurator with support for Betaflight instead of Cleanflight.

This configurator is the only configurator with support for Betaflight specific features. It will likely require that you run the latest firmware on the flight controller.

If you are experiencing any problems please make sure you are running the [latest firmware version](https://github.com/betaflight/betaflight/releases/).

## Installation

### Standalone

We provide a standalone program for Windows, Linux, Mac and Android.

Download the installer from [Releases.](https://github.com/betaflight/betaflight-configurator/releases)

### Notes

#### Windows users

The minimum required version of windows is Windows 8.

#### MacOS X users

Changes to the security model used in the latest versions of MacOS X 10.14 (Mojave) and 10.15 (Catalina) mean that the operating system will show an error message ('"Betaflight Configurator.app" is damaged and can’t be opened. You should move it to the Trash.') when trying to install the application. To work around this, run the following command in a terminal after installing: `sudo xattr -rd com.apple.quarantine /Applications/Betaflight\ Configurator.app`.

#### Linux users

In most Linux distributions your user won't have access to serial interfaces by default. To add this access right type the following command in a terminal, log out your user and log in again:

```
sudo usermod -aG dialout ${USER}
```

Post-installation errors can be prevented by making sure the directory `/usr/share/desktop-directories` exists. To make sure it exists, run the following command before installing the package:

```
sudo mkdir /usr/share/desktop-directories/
```

The `libatomic` library must also be installed before installing Betaflight Configurator. (If the library is missing, the installation will succeed but Betaflight Configurator will not start.) Some Linux distributions (e.g. Fedora) will install it automatically. On Debian or Ubuntu you can install it as follows:

```
sudo apt install libatomic1
```

#### Graphics Issues

If you experience graphics display problems or smudged/dithered fonts display issues in Betaflight Configurator, try invoking the `betaflight-configurator` executable file with the `--disable-gpu` command line switch. This will switch off hardware graphics acceleration. Likewise, setting your graphics card antialiasing option to OFF (e.g. FXAA parameter on NVidia graphics cards) might be a remedy as well.

### Unstable Testing Versions

Unstable testing versions of the latest builds of the configurator for most platforms can be downloaded from [here](https://github.com/betaflight/betaflight-configurator-nightlies/releases/).

**Be aware that these versions are intended for testing / feedback only, and may be buggy or broken, and can cause flight controller settings to be corrupted. Caution is advised when using these versions.**

## Languages

**Please do not submit pull requests for translation changes, but read and follow the instructions below!**

Betaflight Configurator has been translated into several languages. The application will try to detect and use your system language if a translation into this language is available. You can help [translating the application into your language](https://github.com/betaflight/betaflight/tree/master/README.md#translators);

If you prefer to have the application in English or any other language, you can select your desired language in the first screen of the application.

## App build via NW.js (windows/linux/macos) or Cordova (android)

### Development

1. Install node.js (refer to [.nvmrc](./.nvmrc) for required version)
2. Install yarn: `npm install yarn -g`
3. (For Android platform only) Install Java JDK 8, Gradle and Android Studio (Android SDK at least level 19). On Windows you have to extract Gradle binaries to C:\Gradle and set up some environmental variables.

| Variable Name | Value |
|---|---|
| ANDROID_HOME | %LOCALAPPDATA%\Android\sdk |
| ANDROID_SDK_ROOT | %LOCALAPPDATA%\Android\sdk |
| Path | %ANDROID_HOME%\tools<br>%ANDROID_HOME%\platform-tools<br>C:\Gradle\bin |
4. Change to project folder and run `yarn install`.
5. Run `yarn start`.

### Running tests

`yarn test`

### App build and release

The tasks are defined in `gulpfile.js` and can be run with through yarn:
```
yarn gulp <taskname> [[platform] [platform] ...]
```

List of possible values of `<task-name>`:
* **dist** copies all the JS and CSS files in the `./dist` folder [2].
* **apps** builds the apps in the `./apps` folder [1].
* **debug** builds debug version of the apps in the `./debug` folder [1][3].
* **release** zips up the apps into individual archives in the `./release` folder [1]. 

[1] Running this task on macOS or Linux requires Wine, since it's needed to set the icon for the Windows app (build for specific platform to avoid errors).
[2] For Android platform, **dist** task will generate folders and files in the `./dist_cordova` folder.
[3] For Android platform, you need to configure an emulator or to plug an Android device with USB debugging enabled

#### Build or release app for one specific platform
To build or release only for one specific platform you can append the plaform after the `task-name`.
If no platform is provided, the build for the host platform is run.

* **MacOS X** use `yarn gulp <task-name> --osx64`
* **Linux** use `yarn gulp <task-name> --linux64` 
* **Windows** use `yarn gulp <task-name> --win64`
* **Android** use `yarn gulp <task-name> --android`

**Note:** Support for cross-platform building is very limited due to the requirement for platform specific build tools. If in doubt, build on the target platform.

You can also use multiple platforms e.g. `yarn gulp <taskname> --osx64 --linux64`. Other platforms like `--win32`, `--linux32` and `--armv8` can be used too, but they are not officially supported, so use them at your own risk.

## Support

If you need help please reach out on the [betaflightgroup](https://betaflightgroup.slack.com) slack channel before raising issues on github. Register and [request slack access here](https://slack.betaflight.com).

### Issue trackers

For Betaflight configurator issues raise them here

https://github.com/betaflight/betaflight-configurator/issues

For Betaflight firmware issues raise them here

https://github.com/betaflight/betaflight/issues

## Technical details

The configurator is based on chrome.serial API running on Google Chrome/Chromium core.

## Developers

We accept clean and reasonable patches, submit them!

## Credits

ctn - primary author and maintainer of Baseflight Configurator from which Cleanflight Configurator project was forked.

Hydra -  author and maintainer of Cleanflight Configurator from which this project was forked.
