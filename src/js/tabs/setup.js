import { i18n } from '../localization';
import semver from 'semver';
import { isExpertModeEnabled } from '../utils/isExportModeEnabled';
import GUI, { TABS } from '../gui';
import { configuration_backup, configuration_restore } from '../backup_restore';
import { have_sensor } from '../sensor_helpers';
import { mspHelper } from '../msp/MSPHelper';
import FC from '../fc';
import MSP from '../msp';
import Model from '../model';
import MSPCodes from '../msp/MSPCodes';
import CONFIGURATOR, { API_VERSION_1_42, API_VERSION_1_43, API_VERSION_1_46 } from '../data_storage';
import { gui_log } from '../gui_log';

const setup = {
    yaw_fix: 0.0,
};

setup.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab != 'setup') {
        GUI.active_tab = 'setup';
    }

    function load_status() {
        MSP.send_message(MSPCodes.MSP_STATUS_EX, false, false, load_mixer_config);
    }

    function load_mixer_config() {
        MSP.send_message(MSPCodes.MSP_MIXER_CONFIG, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/setup.html", process_html);
    }

    MSP.send_message(MSPCodes.MSP_ACC_TRIM, false, false, load_status);

    function experimentalBackupRestore() {
        const backupButton = $('#content .backup');
        const restoreButton = $('#content .restore');

        backupButton.on('click', () => configuration_backup(() => gui_log(i18n.getMessage('initialSetupBackupSuccess'))));

        restoreButton.on('click', () => configuration_restore(() => {
            // get latest settings
            TABS.setup.initialize();

            gui_log(i18n.getMessage('initialSetupRestoreSuccess'));
        }));

        if (CONFIGURATOR.virtualMode) {
            // saving and uploading an imaginary config to hardware is a bad idea
            backupButton.addClass('disabled');
        } else {
            restoreButton.addClass('disabled');

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                $('.backupRestore').hide();
            }
        }
    }

    function process_html() {
        // translate to user-selected language
        i18n.localizePage();

        experimentalBackupRestore();

        // initialize 3D Model
        self.initModel();

        // set roll in interactive block
        $('span.roll').text(i18n.getMessage('initialSetupAttitude', [0]));
        // set pitch in interactive block
        $('span.pitch').text(i18n.getMessage('initialSetupAttitude', [0]));
        // set heading in interactive block
        $('span.heading').text(i18n.getMessage('initialSetupAttitude', [0]));

        // check if we have accelerometer and magnetometer
        if (!have_sensor(FC.CONFIG.activeSensors, 'acc')) {
            $('a.calibrateAccel').addClass('disabled');
            $('default_btn').addClass('disabled');
        }

        if (!have_sensor(FC.CONFIG.activeSensors, 'mag')) {
            $('a.calibrateMag').addClass('disabled');
            $('default_btn').addClass('disabled');
        }

        self.initializeInstruments();

        $('#arming-disable-flag').attr('title', i18n.getMessage('initialSetupArmingDisableFlagsTooltip'));

        if (isExpertModeEnabled()) {
            $('.initialSetupRebootBootloader').show();
        } else {
            $('.initialSetupRebootBootloader').hide();
        }

        $('a.rebootBootloader').click(function () {
            const buffer = [];
            buffer.push(FC.boardHasFlashBootloader() ? mspHelper.REBOOT_TYPES.BOOTLOADER_FLASH : mspHelper.REBOOT_TYPES.BOOTLOADER);
            MSP.send_message(MSPCodes.MSP_SET_REBOOT, buffer, false);
        });

        // UI Hooks
        $('a.calibrateAccel').click(function () {
            const _self = $(this);

            if (!_self.hasClass('calibrating')) {
                _self.addClass('calibrating');

                // During this period MCU won't be able to process any serial commands because its locked in a for/while loop
                // until this operation finishes, sending more commands through data_poll() will result in serial buffer overflow
                GUI.interval_pause('setup_data_pull');
                MSP.send_message(MSPCodes.MSP_ACC_CALIBRATION, false, false, function () {
                    gui_log(i18n.getMessage('initialSetupAccelCalibStarted'));
                    $('#accel_calib_running').show();
                    $('#accel_calib_rest').hide();
                });

                GUI.timeout_add('button_reset', function () {
                    GUI.interval_resume('setup_data_pull');

                    gui_log(i18n.getMessage('initialSetupAccelCalibEnded'));
                    _self.removeClass('calibrating');
                    $('#accel_calib_running').hide();
                    $('#accel_calib_rest').show();
                }, 2000);
            }
        });

        $('a.calibrateMag').click(function () {
            const _self = $(this);

            if (!_self.hasClass('calibrating') && !_self.hasClass('disabled')) {
                _self.addClass('calibrating');

                MSP.send_message(MSPCodes.MSP_MAG_CALIBRATION, false, false, function () {
                    gui_log(i18n.getMessage('initialSetupMagCalibStarted'));
                    $('#mag_calib_running').show();
                    $('#mag_calib_rest').hide();
                });

                GUI.timeout_add('button_reset', function () {
                    gui_log(i18n.getMessage('initialSetupMagCalibEnded'));
                    _self.removeClass('calibrating');
                    $('#mag_calib_running').hide();
                    $('#mag_calib_rest').show();
                }, 30000);
            }
        });

        const dialogConfirmReset = $('.dialogConfirmReset')[0];

        $('a.resetSettings').click(function () {
            dialogConfirmReset.showModal();
        });

        $('.dialogConfirmReset-cancelbtn').click(function() {
            dialogConfirmReset.close();
        });

        $('.dialogConfirmReset-confirmbtn').click(function() {
            dialogConfirmReset.close();
            MSP.send_message(MSPCodes.MSP_RESET_CONF, false, false, function () {
                gui_log(i18n.getMessage('initialSetupSettingsRestored'));

                GUI.tab_switch_cleanup(function () {
                    TABS.setup.initialize();
                });
            });
        });

        // display current yaw fix value (important during tab re-initialization)
        $('div#interactive_block > a.reset').text(i18n.getMessage('initialSetupButtonResetZaxisValue', [self.yaw_fix]));

        // reset yaw button hook
        $('div#interactive_block > a.reset').click(function () {
            self.yaw_fix = FC.SENSOR_DATA.kinematics[2] * - 1.0;
            $(this).text(i18n.getMessage('initialSetupButtonResetZaxisValue', [self.yaw_fix]));

            console.log(`YAW reset to 0 deg, fix: ${self.yaw_fix} deg`);
        });

        // cached elements
        const bat_voltage_e = $('.bat-voltage'),
            bat_mah_drawn_e = $('.bat-mah-drawn'),
            bat_mah_drawing_e = $('.bat-mah-drawing'),
            rssi_e = $('.rssi'),
            cputemp_e = $('.cpu-temp'),
            arming_disable_flags_e = $('.arming-disable-flags'),
            gpsFix_e = $('.GPS_info span.colorToggle'),
            gpsSats_e = $('.gpsSats'),
            roll_e = $('dd.roll'),
            pitch_e = $('dd.pitch'),
            heading_e = $('dd.heading'),
            sonar_e = $('.sonarAltitude'),
            // Sensor info
            sensor_e = $('.sensor-hw'),
            // Firmware info
            msp_api_e = $('.api-version'),
            build_date_e = $('.build-date'),
            build_info_e = $('.build-info'),
            build_opt_e = $('.build-options');

        // DISARM FLAGS
        // We add all the arming/disarming flags available, and show/hide them if needed.
        // align with betaflight runtime_config.h armingDisableFlags_e
        const prepareDisarmFlags = function() {

            let disarmFlagElements = [
                'NO_GYRO',
                'FAILSAFE',
                'RX_FAILSAFE',
                'BAD_RX_RECOVERY',
                'BOXFAILSAFE',
                'RUNAWAY_TAKEOFF',
                // 'CRASH_DETECTED', only from API 1.42
                'THROTTLE',
                'ANGLE',
                'BOOT_GRACE_TIME',
                'NOPREARM',
                'LOAD',
                'CALIBRATING',
                'CLI',
                'CMS_MENU',
                'BST',
                'MSP',
                'PARALYZE',
                'GPS',
                'RESC',
                'RPMFILTER',
                // 'REBOOT_REQUIRED', only from API 1.42
                // 'DSHOT_BITBANG',   only from API 1.42
                // 'ACC_CALIBRATION', only from API 1.43
                // 'MOTOR_PROTOCOL',  only from API 1.43
                // 'WAITING_FOR_THROW',         only from API ???
                // 'THROW_NOT_READY',         only from API ???
                // 'CATAPULT_NOT_READY',         only from API ???
                // 'NN_MODE',         only from API ???
                // 'ARM_SWITCH',           // Needs to be the last element, since it's always activated if one of the others is active when arming
            ];

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                disarmFlagElements.splice(disarmFlagElements.indexOf('THROTTLE'), 0, 'CRASH_DETECTED');
                disarmFlagElements = disarmFlagElements.concat(['REBOOT_REQUIRED',
                                                                'DSHOT_BITBANG']);
            }

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                disarmFlagElements = disarmFlagElements.concat(['ACC_CALIBRATION',
                                                                'MOTOR_PROTOCOL',
                                                                'WAITING_FOR_THROW',
                                                                'THROW_NOT_READY',
                                                                'CATAPULT_NOT_READY',
                                                                'NN_MODE']);
            }

            // Always the latest element
            disarmFlagElements = disarmFlagElements.concat(['ARM_SWITCH']);

            // Arming allowed flag
            arming_disable_flags_e.append('<span id="initialSetupArmingAllowed" i18n="initialSetupArmingAllowed" style="display: none;"></span>');

            // Arming disabled flags
            for (let i = 0; i < FC.CONFIG.armingDisableCount; i++) {

                // All the known elements but the ARM_SWITCH (it must be always the last element)
                if (i < disarmFlagElements.length - 1) {
                    const messageKey = `initialSetupArmingDisableFlagsTooltip${disarmFlagElements[i]}`;
                    arming_disable_flags_e.append(`<span id="initialSetupArmingDisableFlags${i}" class="cf_tip disarm-flag" title="${i18n.getMessage(messageKey)}" style="display: none;">${disarmFlagElements[i]}</span>`);

                // The ARM_SWITCH, always the last element
                } else if (i == FC.CONFIG.armingDisableCount - 1) {
                    arming_disable_flags_e.append(`<span id="initialSetupArmingDisableFlags${i}" class="cf_tip disarm-flag" title="${i18n.getMessage('initialSetupArmingDisableFlagsTooltipARM_SWITCH')}" style="display: none;">ARM_SWITCH</span>`);

                // Unknown disarm flags
                } else {
                    arming_disable_flags_e.append(`<span id="initialSetupArmingDisableFlags${i}" class="disarm-flag" style="display: none;">${i + 1}</span>`);
                }
            }
        };

        const showSensorInfo = function() {
            let accElements = [
                'DEFAULT',
                'NONE',
                'ADXL345',
                'MPU6050',
                'MMA8452',
                'BMA280',
                'LSM303DLHC',
                'MPU6000',
                'MPU6500',
                'MPU9250',
                'ICM20601',
                'ICM20602',
                'ICM20608G',
                'ICM20649',
                'ICM20689',
                'ICM42605',
                'ICM42688P',
                'BMI160',
                'BMI270',
                'LSM6DSO',
                'VIRTUAL',
            ];

            let baroElements = [
                'DEFAULT',
                'NONE',
                'BMP085',
                'MS5611',
                'BMP280',
                'LPS',
                'QMP6988',
                'BMP388',
                'DPS310',
                '2SMPB_02B',
                'VIRTUAL',
            ];

            let magElements = [
                'DEFAULT',
                'NONE',
                'HMC5883',
                'AK8975',
                'AK8963',
                'QMC5883',
                'LIS3MDL',
                'MPU925X_AK8963',
            ];

            let sonarElements = [
                'NONE',
                'HCSR04',
                'TFMINI',
                'TF02',
            ];

            MSP.send_message(MSPCodes.MSP_SENSOR_CONFIG, false, false, function() {
                // Sensor info
                let appendComma = false;
                sensor_e.text('');
                if (have_sensor(FC.CONFIG.activeSensors, "acc") && FC.SENSOR_CONFIG.acc_hardware > 1) {
                    sensor_e.append(i18n.getMessage('sensorStatusAccelShort'), ': ', accElements[[FC.SENSOR_CONFIG.acc_hardware]]);
                    appendComma = true;
                }
                if (have_sensor(FC.CONFIG.activeSensors, "baro") && FC.SENSOR_CONFIG.baro_hardware > 1) {
                    if (appendComma) {
                        sensor_e.append(', ');
                    }
                    sensor_e.append(i18n.getMessage('sensorStatusBaroShort'), ': ', baroElements[[FC.SENSOR_CONFIG.baro_hardware]]);
                    appendComma = true;
                }
                if (have_sensor(FC.CONFIG.activeSensors, "mag") && FC.SENSOR_CONFIG.mag_hardware > 1) {
                    if (appendComma) {
                        sensor_e.append(', ');
                    }
                    sensor_e.append(i18n.getMessage('sensorStatusMagShort'), ': ', magElements[[FC.SENSOR_CONFIG.mag_hardware]]);
                    appendComma = true;
                }
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_46) && have_sensor(FC.CONFIG.activeSensors, "sonar") && FC.SENSOR_CONFIG.sonar_hardware > 1) {
                    if (appendComma) {
                        sensor_e.append(', ');
                    }
                    sensor_e.append(i18n.getMessage('sensorStatusSonarShort'), ': ', sonarElements[[FC.SENSOR_CONFIG.sonar_hardware]]);
                }
            });
        };

        const showFirmwareInfo = function() {
            // Firmware info
            msp_api_e.text([FC.CONFIG.apiVersion]);
            build_date_e.text([FC.CONFIG.buildInfo]);

            if (FC.CONFIG.buildKey.length === 32) {
                const buildRoot   = `https://build.betaflight.com/api/builds/${FC.CONFIG.buildKey}`;
                const buildConfig = `<span class="buildInfoBtn" title="${i18n.getMessage('initialSetupInfoBuildInfoConfig')}: ${buildRoot}/json">
                                     <a href="${buildRoot}/json" target="_blank"><strong>${i18n.getMessage('initialSetupInfoBuildInfoConfig')}</a></strong></span>`;
                const buildLog =    `<span class="buildInfoBtn" title="${i18n.getMessage('initialSetupInfoBuildInfoLog')}: ${buildRoot}/log">
                                     <a href="${buildRoot}/log" target="_blank"><strong>${i18n.getMessage('initialSetupInfoBuildInfoLog')}</a></strong></span>`;
                build_info_e.html(`${buildConfig} &nbsp &nbsp ${buildLog}`);
                $('.build-info a').removeClass('disabled');
            } else {
                $('.build-info a').addClass('disabled');
            }

            if (FC.CONFIG.buildOptions.length) {
                let buildOptions = "";
                build_opt_e.text = "";

                for (const buildOption of FC.CONFIG.buildOptions) {
                    buildOptions = `${buildOptions} &nbsp ${buildOption}`;
                }
                build_opt_e.html(`<span class="buildInfoClassOptions" 
                                  title="${i18n.getMessage('initialSetupInfoBuildOptions')}${buildOptions}">
                                  <strong>${i18n.getMessage('initialSetupInfoBuildOptionsList')}</strong></span>`);
            } else {
                build_opt_e.html(i18n.getMessage(navigator.onLine ? 'initialSetupInfoBuildOptionsEmpty' : 'initialSetupNotOnline'));
            }
        };

        prepareDisarmFlags();
        showSensorInfo();
        showFirmwareInfo();

        // Show Sonar info box if sensor exist
        if (!have_sensor(FC.CONFIG.activeSensors, 'sonar')) {
            $('.sonarBox').hide();
        }

        function get_slow_data() {

            // Status info is acquired in the background using update_live_status() in serial_backend.js

            $('#initialSetupArmingAllowed').toggle(FC.CONFIG.armingDisableFlags === 0);

            for (let i = 0; i < FC.CONFIG.armingDisableCount; i++) {
                $(`#initialSetupArmingDisableFlags${i}`).css('display',(FC.CONFIG.armingDisableFlags & (1 << i)) === 0 ? 'none':'inline-block');
            }

            // System info is acquired in the background using update_live_status() in serial_backend.js

            bat_voltage_e.text(i18n.getMessage('initialSetupBatteryValue', [FC.ANALOG.voltage]));
            bat_mah_drawn_e.text(i18n.getMessage('initialSetupBatteryMahValue', [FC.ANALOG.mAhdrawn]));
            bat_mah_drawing_e.text(i18n.getMessage('initialSetupBatteryAValue', [FC.ANALOG.amperage.toFixed(2)]));
            rssi_e.text(i18n.getMessage('initialSetupRSSIValue', [((FC.ANALOG.rssi / 1023) * 100).toFixed(0)]));

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_46) && FC.CONFIG.cpuTemp) {
                cputemp_e.html(`${FC.CONFIG.cpuTemp.toFixed(0)} &#8451;`);
            }

            // GPS info is acquired in the background using update_live_status() in serial_backend.js
            gpsFix_e.text(FC.GPS_DATA.fix ? i18n.getMessage('gpsFixTrue') : i18n.getMessage('gpsFixFalse'));
            gpsFix_e.toggleClass('ready', FC.GPS_DATA.fix != 0);
            gpsSats_e.text(FC.GPS_DATA.numSat);

            const lat = FC.GPS_DATA.lat / 10000000;
            const lon = FC.GPS_DATA.lon / 10000000;
            const url = `https://maps.google.com/?q=${lat},${lon}`;
            const gpsUnitText = i18n.getMessage('gpsPositionUnit');
            $('.GPS_info td.latLon a').prop('href', url).text(`${lat.toFixed(4)} ${gpsUnitText} / ${lon.toFixed(4)} ${gpsUnitText}`);
        }

        function get_fast_data() {
            MSP.send_message(MSPCodes.MSP_ATTITUDE, false, false, function () {
                roll_e.text(i18n.getMessage('initialSetupAttitude', [FC.SENSOR_DATA.kinematics[0]]));
                pitch_e.text(i18n.getMessage('initialSetupAttitude', [FC.SENSOR_DATA.kinematics[1]]));
                heading_e.text(i18n.getMessage('initialSetupAttitude', [FC.SENSOR_DATA.kinematics[2]]));

                self.renderModel();
                self.updateInstruments();
            });
            // get Sonar altitude if sensor exist
            if (have_sensor(FC.CONFIG.activeSensors, 'sonar')) {
                MSP.send_message(MSPCodes.MSP_SONAR, false, false, function () {
                    sonar_e.text(`${FC.SENSOR_DATA.sonar.toFixed(1)} cm`);
                });
            }
        }

        GUI.interval_add('setup_data_pull_fast', get_fast_data, 33, true); // 30 fps
        GUI.interval_add('setup_data_pull_slow', get_slow_data, 250, true); // 4 fps

        GUI.content_ready(callback);
    }
};

setup.initializeInstruments = function() {
    const options = {size:90, showBox : false, img_directory: 'images/flightindicators/'};
    const attitude = $.flightIndicator('#attitude', 'attitude', options);
    const heading = $.flightIndicator('#heading', 'heading', options);

    this.updateInstruments = function() {
        attitude.setRoll(FC.SENSOR_DATA.kinematics[0]);
        attitude.setPitch(FC.SENSOR_DATA.kinematics[1]);
        heading.setHeading(FC.SENSOR_DATA.kinematics[2]);
    };
};

setup.initModel = function () {
    this.model = new Model($('.model-and-info #canvas_wrapper'), $('.model-and-info #canvas'));

    $(window).on('resize', $.proxy(this.model.resize, this.model));
};

setup.renderModel = function () {
    const x = (FC.SENSOR_DATA.kinematics[1] * 1.0) * 0.017453292519943295,
        y = ((FC.SENSOR_DATA.kinematics[2] * -1.0) - this.yaw_fix) * 0.017453292519943295,
        z = (FC.SENSOR_DATA.kinematics[0] * -1.0) * 0.017453292519943295;

    this.model.rotateTo(x, y, z);
};

setup.cleanup = function (callback) {
    if (this.model) {
        $(window).off('resize', $.proxy(this.model.resize, this.model));
        this.model.dispose();
    }

    if (callback) callback();
};

TABS.setup = setup;

export { setup };
