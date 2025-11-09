import process from 'node:process';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

import notifier from 'node-notifier';
import dateFormat from 'dateformat';

import { parameters } from './params.ts';
import { Status, Location } from './common.ts';
import { Sun } from './sun.ts';
import { Weather } from './weather.ts';
import { Aurora } from './aurora.ts';

import type { SunData } from './sun.ts';
import type { AuroraStation } from './aurora.ts';


const INTERVAL_AURORA_MIN = 10;
const INTERVAL_AURORA_MS = INTERVAL_AURORA_MIN * 60 * 1000;
const INTERVAL_WEATHER_MS = 30 * 60 * 1000;
const INTERVAL_RETRY_ON_ERROR_MS = 3 * 60 * 1000;
const INTERVAL_SUN_MS = 10 * 1000;


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Data fetching functions

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
		log('SUN', 'FORMAT', sunDataJson);
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
		return { status: Status.OK, cloudness: weatherData?.Cloudness, date };
	}
	catch {
		log('WEATHER', 'FORMAT', weatherXml);
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
		log('AURORA', 'FORMAT', data);
		return { status: Status.ERROR_FORMAT };
	}
	
	const station = Aurora.getStation(stations);
	if (!station) {
		log('AURORA', 'NOSTATION', data);
		return { status: Status.ERROR_NO_STATION };
	}
	
	return { status: Status.OK, station };
}


// Data handling functions, each returns an interval to wait 
// until the next cycle occurs

function handleSunData(status: number, data?: SunData) {
	if (status !== Status.OK) {
		printQueryError('Sun', status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}

	if (data !== undefined) {
		_sunData = data;
	}
	const time = dateFormat(new Date(), "HH:MM");

	let interval = INTERVAL_SUN_MS;
	if (!_sunData?.isDarkNow()) {
		interval = _sunData?.getTimeToDusk() || 0;
		const timeToContinue = dateFormat(new Date(Date.now() + interval), "HH:MM");
		console.log(`${time} It is not dark yet. Continue the service at ${timeToContinue}.`);
	}
	else {
		console.log(`${time} Sun data checked.`);
	}

	return interval;
}

async function handleCloudnessData(status: number, cloudness?: number, date?: Date) {
	if (status !== Status.OK) {
		printQueryError('Weather', status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}
	
	const time = date
		? dateFormat(date, "HH:MM") 
		: dateFormat(new Date(), "HH:MM");
	
	if (isNaN(cloudness!) || cloudness === undefined) {
		if (_showWeatherStatiionWarning) {
			_showWeatherStatiionWarning = false;
			console.warn(`Warning: FMI weather station "${parameters.station}" does not provide cloudness data. Continue without cloudness checks.`);
		}
		return 0;
	}

	cloudness ||= 8;	// treat undefined as fully cloudy
	if (0 <= cloudness && cloudness <= 4) {
		const message = cloudness < 2
			? 'The sky is clear.'
			: 'The sky is somewhat cloudy.';

		console.log(`${time} ${message}`);

		await new Promise((resolve) => setTimeout(() => { resolve(0) }, 3000) );

		return 0;	// causes to check auroras
	}
	else {
		console.log(`${time} Too cloudy to check auroras (${cloudness} / 8)`);
		return INTERVAL_WEATHER_MS;
	}
}

function handleAuroraData(status: number, station?: AuroraStation) {
	if (status !== Status.OK) {
		printQueryError('Aurora', status);
		return INTERVAL_RETRY_ON_ERROR_MS;
	}

	let message = `${station?.name} R-index: ${station?.RX}. `;
	let showAsNotification = false;

	if (station?.isRIndexHigh()) {
		message += 'Check the sky!';
		showAsNotification = true;
	}
	else if (station?.isRIndexMedium()) {
		message += 'Possible auroras.';
		showAsNotification = true;
	}
	else {
		message += 'No auroras.';
	}

	const time = dateFormat(station?.time || '', "HH:MM");
	console.log(`${time} ${message}`);

	if (showAsNotification) {
		showMessage('Attention!', message);
	}

	return INTERVAL_AURORA_MS;
}


// Info output functions

function showMessage(title: string, message: string) {
	if (parameters.consoleOnly) {
		return;
	}

	notifier.notify({
		appID: 'Aurora Alarm',
		title,
		message,
		sound: true,
		icon:  path.join(__dirname, '..\\assets\\images\\icon.png'),
	});
}


function log(service: string, info: string, data: string) {
	const str = JSON.stringify(data);
	writeFile('log.txt',
		`${dateFormat(new Date(), "yyyy-mm-dd HH:MM")}\t[${service}]\t${info}\t${str}\n`,
		{
			encoding: 'utf8',
			flag: 'a'
		});
}

function printQueryError(service: string, status: number) {
	let message = null;
	switch (status) {
		case Status.OK:
			break;
		case Status.ERROR_FETCH:
			message = `${service} data server does not respond`;
			break;
		case Status.ERROR_PARSE:
			message = `Cannot parse ${service} data`;
			break;
		case Status.ERROR_FORMAT:
			message = `Unexpected data format of ${service} data`;
			break;
		case Status.ERROR_NO_STATION:
			message = `${service} station is off or does not exist`;
			break;
		default:
			message = `${service}: unknown error`;
			break;
	}

	if (message) {
		console.error(`${dateFormat(new Date(), "HH:MM")} Error ${status}: ${message}`);
	}
}

async function run() {
	try {
		const weatherData = await Weather.fetch();
		if (!weatherData) {
			console.error('Cannot fetch initial weather data');
			return Status.ERROR_FETCH;
		}

		const location = Weather.getLocation(weatherData);
		if (!location) {
			return Status.ERROR_PARSE;
		}

		Location.lattitude = location?.latitude;
		Location.longitude = location?.longitude;
	}
	catch (error) {
		console.error('Issues with initialization: ' + error);
		return Status.ERROR_FORMAT;
	}

	cycle();

	return Status.OK;
}


// The inpection function, runs in a cycle

async function cycle() {
	const time = dateFormat(new Date(), "HH:MM");
	let interval = 0;

	if (_sunData === null) {
		try {
			const {status, data} = await getSunData();
			interval = handleSunData(status, data);
		}
		catch (error) {
			console.error('Issues with fetching sun data: ' + error);
		}
	}
	else if (!_sunData.isDarkNow() || !_sunData.isTodaysData()) {
		_sunData = null;
		interval = INTERVAL_SUN_MS;
	}
	else {
		try {
			const {status, cloudness, date} = await checkCloudness();
			interval = await handleCloudnessData(status, cloudness, date);
		}
		catch (error) {
			console.error('Issues with fetching cloudness data: ' + error);
		}

		if (interval === 0) {
			try {
				const { status, station } = await checkAurora();
				interval = handleAuroraData(status, station);
			}
			catch (error) {
				console.error('Issues with fetching aurora data: ' + error);
			}
		}
	}

	_timeoutlHandle = setTimeout(cycle, interval);
}


// Program entry

let _timeoutlHandle: NodeJS.Timeout | null = null;
let _sunData: SunData | null = null;
let _showWeatherStatiionWarning: boolean = true;

console.log(`Aurora Alarm for ${parameters.station} is running. Press Ctrl+C to exit.`);

run()
	.then((status: number) => {
		if (status !== Status.OK) {
			if (status === Status.ERROR_PARSE) {
				console.error(`No FMI weather station of name "${parameters.station}" exist. Exiting...`);
			}
			else {
				printQueryError('Weather', status);
				_timeoutlHandle = setTimeout(run, INTERVAL_RETRY_ON_ERROR_MS);
			}
		}
		else if (!_timeoutlHandle) {
			showMessage(`${parameters.station}`, `Checking the aurora status every ${INTERVAL_AURORA_MIN} minutes...`);
		}
	});

process.on('SIGINT', () => {	// Handle graceful shutdown
		if (_timeoutlHandle) {
    	clearTimeout(_timeoutlHandle);
		}
    console.log('\nShutting down...');
    process.exit(0);
});
