import semver from 'semver';
import { i18n } from '../localization';
import GUI, { TABS } from '../gui';
import { gui_log } from "../gui_log";
import { tracking } from "../Analytics";
import { mspHelper } from '../msp/MSPHelper';
import FC from '../fc';
import MSP from '../msp';
import MSPCodes from '../msp/MSPCodes';
import { API_VERSION_1_42, API_VERSION_1_43, API_VERSION_1_45 } from '../data_storage';
import { updateTabList } from '../utils/updateTabList';

const indi = {
    analyticsChanges: {},
};

indi.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab != 'indi') {
        GUI.active_tab = 'indi';
        GUI.configuration_loaded = true;
    }

    function load_serial_config() {
        mspHelper.loadSerialConfig(load_config);
    }

    function load_config() {
        Promise
        .resolve(true)
        .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_BEEPER_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_BOARD_ALIGNMENT_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_ACC_TRIM))
        .then(() => MSP.promise(MSPCodes.MSP_ARMING_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_RC_DEADBAND))
        .then(() => MSP.promise(MSPCodes.MSP_SENSOR_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_SENSOR_ALIGNMENT))
        .then(() => semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_45)
            ? MSP.promise(MSPCodes.MSP_NAME)
            : Promise.resolve(true))
        .then(() => semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_45)
            ? MSP.promise(MSPCodes.MSP2_GET_TEXT, mspHelper.crunch(MSPCodes.MSP2_GET_TEXT, MSPCodes.CRAFT_NAME))
            : Promise.resolve(true))
        .then(() => MSP.promise(MSPCodes.MSP_RX_CONFIG))
        .then(() => semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_45)
            ? MSP.promise(MSPCodes.MSP2_GET_TEXT, mspHelper.crunch(MSPCodes.MSP2_GET_TEXT, MSPCodes.PILOT_NAME)) : Promise.resolve(true))
        .then(() => MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG))
        .then(() => load_html());
    }

    function load_html() {
        $('#content').load("./tabs/indi.html", process_html);
    }

    load_serial_config();

    function process_html() {
        self.analyticsChanges = {};

        // translate to user-selected language
        i18n.localizePage();

        $('a.save').on('click', function() {
            gui_log("Nothing implemented yet.");
        });

        // status data pulled via separate timer with static speed
        GUI.interval_add('status_pull', function() {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);
        GUI.content_ready(callback);
    }
};

indi.cleanup = function (callback) {
    if (callback) callback();
};

TABS.indi = indi;
export { indi };
