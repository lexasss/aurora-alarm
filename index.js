const fetch = require('node-fetch').default;
const notifier = require('node-notifier');
const path = require('path');
const dateFormat = require('dateformat').default;

const STATION_NAME = 'NUR';
const INTERVAL_MIN = 15;
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000; // 15 minutes in milliseconds

const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

const STATUS_OK = 0;
const STATUS_ERROR_FETCH = 1;
const STATUS_ERROR_FORMAT = 2;
const STATUS_ERROR_NO_STATION = 3;
const STATUS_ERROR_PARSE = 4;

// CLASSES

/*
const dataUrl1 = 'https://space.fmi.fi/MIRACLE/RWC/data/r_index_latest_en.json';
class Station1 {
	constructor() {
		this['Time'] = new Date().toString();
		this['R-index'] = 0;
		this['Geographic latitude'] = 0;
		this['Geographic longitude'] = 0;
		this['Limit value lower'] = 0;
		this['Limit value higher'] = 0;
		this['Probability of auroras'] = "";
	}
}*/

const dataUrl2 = 'https://space.fmi.fi/MIRACLE/RWC/data/RX_latest_en.json';
class Station2 {
	constructor() {
		this.time = new Date().toString();
		this.RX = {
			value: 0,
			'activity level': ""
		};
		this.RXmin = {
			value: 0,
			'activity level': ""
		};
		this.RXmax = {
			value: 0,
			'activity level': ""
		};
		this.station = "";
	}

	static fromJson(json) {
		const station = new Station2();
		station.time = json['time'];
		station.RX = json['RX'];
		station.RXmin = json['RXmin'];
		station.RXmax = json['RXmax'];
		station.station = json['station'];
		return station;
	}
}


// FUNCTIONS

async function fetchData(url) {
	let data = null;
	try {
		const response = await fetch(url);
		const json = await response.text();
		data = JSON.parse(json);
	} catch (error) {
		return null;
	}
	return data;
}


async function getStations(data) {
	const result = {};
	if (!data['info'] || !data['data'])
		return null;

	for (const id in data['data']) {
		result[id] = Station2.fromJson(data['data'][id]);
	}

	return result;
}


async function getStationRIndex(station, dataTree) {
	if (!station) {
		return { stationName: null, rIndex: undefined };
	}

	let obj = station;
	dataTree.forEach(key => {
		if (obj && key in obj) {
			obj = obj[key];
		}
	});

	return { stationName: station['station'], rIndex: obj };
};


async function check() {
	hasDisplayedNotification = false;

	const data = await fetchData(dataUrl2);
	if (data === null) {
		return STATUS_ERROR_FETCH;
	}

	const stations = await getStations(data);
	if (stations === null) {
		return STATUS_ERROR_FORMAT;
	}
	
	const station = stations[STATION_NAME];

	const { stationName,  rIndex } = await getStationRIndex(station, ['RX', 'value']);

	let message = '';
	let showAsNotification = false;

	if (rIndex === undefined) {
		return STATUS_ERROR_NO_STATION;
	}
	else if (rIndex === null) {
		return STATUS_ERROR_PARSE;
	}
	else if (rIndex > R_INDEX_THRESHOLD_HIGH) {
		message = `${stationName} R-index: ${rIndex}. Check the sky!`;
		showAsNotification = true;
	}
	else if (rIndex > R_INDEX_THRESHOLD_MEDIUM) {
		message = `${stationName} R-index: ${rIndex}. Possible auroras.`;
		showAsNotification = true;
	}
	else {
		message = `${stationName} R-index: ${rIndex}. No auroras.`;
	}

	if (message) {
		console.log(`${dateFormat(new Date(station.time), "HH:MM")}  ${message}`);

		if (showAsNotification) {
			hasDisplayedNotification = true;
			showMessage('Attention!', message);
		}
	}

	return STATUS_OK;
}


function showMessage(title, message) {
	notifier.notify({
		appID: 'Aurora Alarm',
		title,
		message,
		sound: true,
		icon:  path.join(__dirname, 'assets\\images\\icon.png'),
	});
}


function printStatus(status) {
	let message = '';
	switch (status) {
		case STATUS_OK:
			break;
		case STATUS_ERROR_FETCH:
			message = 'Data server does not reponse';
			break;
		case STATUS_ERROR_FORMAT:
			message = 'Unexpected JSON format';
			break;
		case STATUS_ERROR_NO_STATION:
			message = `Station "${STATION_NAME}" is off or does not exist`;
			break;
		case STATUS_ERROR_PARSE:
			message = 'Unexpected station data format';
			break;
		default:
			message = 'Unknown error';
			break;
	}

	if (message) {
		console.error(`${dateFormat(new Date(), "HH:MM")}  Error: ${message}`);
	}
}


function cycle() {
	check()
		.catch(console.error)
		.then((status) => {
			printStatus(status);
			return status === STATUS_OK
				? INTERVAL_MS
				: INTERVAL_MS / 6;		// On error, retry sooner
		})
		.then((interval) => {
			setTimeout(cycle, interval);
		});
}


// MAIN EXECUTION

let timeoutlHandle = 0;
let hasDisplayedNotification = false;

cycle();

if (!hasDisplayedNotification) {
	showMessage('Started', `Checking the aurora status every ${INTERVAL_MIN} minutes...`);
}


// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearTimeout(timeoutlHandle);
    process.exit(0);
});

console.log('Aurora Alarm is running. Press Ctrl+C to exit.');