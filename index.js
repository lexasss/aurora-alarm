const fetch = require('node-fetch').default;
const notifier = require('node-notifier');
//const WindowsBalloon = require('node-notifier').WindowsBalloon;
const path = require('path');

const STATION_NAME = 'NUR';
const INTERVAL_MIN = 15;
const INTERVAL_MS = INTERVAL_MIN * 60 * 1000; // 15 minutes in milliseconds

const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

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
		this['time'] = new Date().toString();
		this['RX'] = {
			'value': 0,
			'activity level': ""
		};
		this['RXmin'] = {
			'value': 0,
			'activity level': ""
		};
		this['RXmax'] = {
			'value': 0,
			'activity level': ""
		};
		this['station'] = "";
	}

	static fromJson(json) {
		const station = new Station2();
		station['time'] = json['time'];
		station['RX'] = json['RX'];
		station['RXmin'] = json['RXmin'];
		station['RXmax'] = json['RXmax'];
		station['station'] = json['station'];
		return station;
	}
}

async function getStations(url) {

	let datasheet;
	try {
		const response = await fetch(url);
		const json = await response.text();
		datasheet = JSON.parse(json);
	} catch (error) {
		console.error('Error fetching data:', error);
		return null;
	}

	const result = {};
	if (!datasheet || !datasheet['info'] || !datasheet['data'])
		return null;

	for (const id in datasheet['data']) {
		result[id] = Station2.fromJson(datasheet['data'][id]);
	}

	return result;
}

async function getStationRIndex(stations, stationName, fieldNames) {
	if (stations === null) {
		return { station: null, rIndex: undefined };
	}

	var station = stations[stationName];
	if (station) {
		obj = station;
		fieldNames.forEach(fieldName => {
			if (obj && fieldName in obj) {
				obj = obj[fieldName];
			}
		});
		return { station: station['station'], rIndex: obj };
	}

	return { station: null, rIndex: undefined };
};

async function check() {

	const stations = await getStations(dataUrl2);
	if (stations === null) {
		return;
	}
	
	const { station: stationName,  rIndex } = await getStationRIndex(stations, STATION_NAME, ['RX', 'value']);

	let message = '';
	let showAsNotification = false;

	if (rIndex === undefined) {
		message = 'Internal error';
	}
	else if (rIndex === null) {
		message = 'Station not found or switch off';
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

	console.log(message);

	if (showAsNotification) {
		showMessage('Attention!', message);
	}
}

/*const wbNotifier = new WindowsBalloon({
  withFallback: false, 
  customPath: undefined // Relative/Absolute path if you want to use your fork of notifu
});*/

function showMessage(title, message) {
	/*wbNotifier.notify({
		title: 'Aurora Alarm',
		message,
		sound: true,
		time: 10000,
		wait: false, // Wait for User Action against Notification
    type: 'info' // The notification type : info | warn | error
	});
	/*/
	notifier.notify({
		appID: 'Aurora Alarm',
		title,
		message,
		sound: true,
		icon:  path.join(__dirname, 'assets\\images\\icon.png'),
	});
	//*/
}


// MAIN EXECUTION


showMessage('Started', `Checking the aurora status every ${INTERVAL_MIN} minutes...`);

// Run immediately on start
check().catch(console.error);

// Then schedule recurring execution
const intervalHandle = setInterval(() => {
    check().catch(console.error);
}, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearInterval(intervalHandle);
    process.exit(0);
});

console.log('Aurora Alarm is running. Press Ctrl+C to exit.');