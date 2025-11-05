import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { writeFile } from 'node:fs/promises';

import notifier from 'node-notifier';
import dateFormat from 'dateformat';

import { Status } from './common.js';
import { Sun } from './sun.js';
import { Weather } from './weather.js';
import { Aurora } from './aurora.js';


const INTERVAL_AURORA_MIN = 10;
const INTERVAL_AURORA_MS = INTERVAL_AURORA_MIN * 60 * 1000;
const INTERVAL_WEATHER_MS = 30 * 60 * 1000;
const INTERVAL_RETRY_ON_ERROR_MS = 3 * 60 * 1000;
const INTERVAL_SUN_MS = 10 * 1000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// FUNCTIONS

async function getSunData() {
	const sunDataJson = await Sun.fetch();
	if (!sunDataJson) {
		return { status: Status.ERROR_FETCH  };
	}

	try {
		const sunData = Sun.toObject(sunDataJson);
		return { status: Status.OK, data: sunData };
	} 
	catch (error) {
		log('SUN FORMAT ERROR', sunDataJson);
		return { status: Status.ERROR_FORMAT };
	}
}

async function checkCloudness() {
	const weatherXml = await Weather.fetch();
	if (!weatherXml) {
		return { status: Status.ERROR_FETCH };
	}

	try {
		const { date, weatherData } = Weather.getLastObservation(weatherXml);
		return { status: Status.OK, cloudness: weatherData.Cloudness, date };
	}
	catch {
		log('WEATHER FORMAT ERROR', weatherXml);
		return { status: Status.ERROR_FORMAT };
	}
};

async function checkAurora() {
	const data = await Aurora.fetch();
	if (!data) {
		return { status: Status.ERROR_FETCH };
	}

	const stations = Aurora.getStations(data);
	if (!stations) {
		log('AURORA FORMAT ERROR', data);
		return { status: Status.ERROR_FORMAT };
	}
	
	const station = Aurora.getStation(stations);
	if (!station) {
		log('AURORA NO STATION', data);
		return { status: Status.ERROR_NO_STATION };
	}
	
	return { status: Status.OK, station };
}

function handleSunData(status, data) {
	if (status !== Status.OK) {
		printQueryError(status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}

	_sunData = data;

	if (!_sunData.isDarkNow()) {
		const time = dateFormat(new Date(), "HH:MM");
		console.log(`${time} It is not yet dark, continue the service when the night comes.`);
	}

	return !_sunData.isDarkNow()
		? _sunData.getTimeToDusk()
		: INTERVAL_SUN_MS;
}

async function handleCloudnessData(status, cloudness, date) {
	if (status !== Status.OK) {
		printQueryError(status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}
	
	const time = date
		? dateFormat(date, "HH:MM") 
		: dateFormat(new Date(), "HH:MM");
	
	if (cloudness <= 4) {
		const message = cloudness < 2
			? 'The sky is clear.'
			: 'The sky is somewaht cloudy.';

		console.log(`${time} ${message}`);

		await new Promise((resolve) => setTimeout(() => { resolve() }, 3000) );

		return 0;	// causes to check auroras
	}
	else {
		console.log(`${time} Too cloudy to check auroras (${cloudness} / 8)`);
		return INTERVAL_WEATHER_MS;
	}
}

function handleAuroraData(status, station) {
	if (status !== Status.OK) {
		printQueryError(status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}

	let message = `${station.station} R-index: ${station.RX.value}. `;
	let showAsNotification = false;

	if (station.isRIndexHigh()) {
		message += 'Check the sky!';
		showAsNotification = true;
	}
	else if (station.isRIndexMedium()) {
		message += 'Possible auroras.';
		showAsNotification = true;
	}
	else {
		message += 'No auroras.';
	}

	console.log(`${dateFormat(new Date(station.time), "HH:MM")} ${message}`);

	if (showAsNotification) {
		showMessage('Attention!', message);
	}

	return INTERVAL_AURORA_MS;
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


function log(message, data) {
	const str = JSON.stringify(data);
	writeFile('log.txt', `${dateFormat(new Date(), "yyyy-mm-dd HH:MM")} ${message} ${str}\n`, {
		encoding: 'utf8',
		flag: 'a'
	}, (err) => {
		if (err) {
			console.log('Failed to save data in the log file.');
		}
	});
}

function printQueryError(status) {
	let message = null;
	switch (status) {
		case Status.OK:
			break;
		case Status.ERROR_FETCH:
			message = 'Data server does not reponse';
			break;
		case Status.ERROR_PARSE:
			message = 'Cannot parse the data';
			break;
		case Status.ERROR_FORMAT:
			message = 'Unexpected data format';
			break;
		case Status.ERROR_NO_STATION:
			message = `Station is off or does not exist`;
			break;
		default:
			message = 'Unknown error';
			break;
	}

	if (message) {
		console.error(`${dateFormat(new Date(), "HH:MM")} Error ${status}: ${message}`);
	}
}


async function cycle() {
	const time = dateFormat(new Date(), "HH:MM");

	if (_sunData === null) {
		let interval = 0;
		console.log(`${time} Retrieving sun data...`);
		try {
			const {status, data} = await getSunData();
			interval = handleSunData(status, data);
		}
		catch (error) {
			console.error('Issues with fetching sun data: ' + error);
		}

		setTimeout(cycle, interval);
	}
	else if (!_sunData.isDarkNow() || !_sunData.isTodaysData()) {
		_sunData = null;
		setTimeout(cycle, INTERVAL_SUN_MS);
	}
	else {
		let interval = 0;
		console.log(`${time} Retrieving cloudness data...`);
		try {
			const {status, cloudness, date} = await checkCloudness();
			interval = await handleCloudnessData(status, cloudness, date);
		}
		catch (error) {
			console.error('Issues with fetching cloudness data: ' + error);
		}

		if (interval === 0) {
			console.log(`${time} Retrieving aurora data...`);
			try {
				const { status, station } = await checkAurora();
				interval = handleAuroraData(status, station);
			}
			catch (error) {
				console.error('Issues with fetching aurora data: ' + error);
			}
		}

		setTimeout(cycle, interval);
	}
}


// MAIN EXECUTION

let _timeoutlHandle = 0;
let _sunData = null;

console.log('Aurora Alarm is running. Press Ctrl+C to exit.');

cycle();

showMessage('Started', `Checking the aurora status every ${INTERVAL_AURORA_MIN} minutes...`);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearTimeout(_timeoutlHandle);
    process.exit(0);
});
