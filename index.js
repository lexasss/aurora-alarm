const fetch = require('node-fetch').default;
const notifier = require('node-notifier');
const path = require('path');
const dateFormat = require('dateformat').default;
const { XMLParser } = require("fast-xml-parser");

const AURORA_STATION_NAME = 'NUR';
const WEATHER_STATION_NAME = 'Pirkkala';

const INTERVAL_AURORA_MIN = 10;
const INTERVAL_AURORA_MS = INTERVAL_AURORA_MIN * 60 * 1000;
const INTERVAL_WEATHER_MS = 30 * 60 * 1000;
const INTERVAL_RETRY_ON_ERROR_MS = 3 * 60 * 1000;
const INTERVAL_FIRST_TIME_CHECK_MS = 12 * 1000;

const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

const STATUS_OK = 0;
const STATUS_ERROR_FETCH = 1;
const STATUS_ERROR_FORMAT = 2;
const STATUS_ERROR_NO_STATION = 3;
const STATUS_ERROR_PARSE = 4;

const SOURCE_AURORA = 0;
const SOURCE_WEATHER = 1;

const xmlParser = new XMLParser();

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

const auroraUrl = 'https://space.fmi.fi/MIRACLE/RWC/data/RX_latest_en.json';
class AuroraStation {
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
		const station = new AuroraStation();
		station.time = json['time'];
		station.RX = json['RX'];
		station.RXmin = json['RXmin'];
		station.RXmax = json['RXmax'];
		station.station = json['station'];
		return station;
	}
}

const weatherUrl = "https://opendata.fmi.fi/wfs";
const weatherQueryParams = {
	service: "WFS",
	version: "2.0.0",
	request: "getFeature",
	storedquery_id: "fmi::observations::weather::multipointcoverage",
	place: WEATHER_STATION_NAME
};
class WeatherStationData {
	constructor(values) {
		this.Temperature = values[0];
		this.WindSpeed = values[1];
		this.GustSpeed = values[2];
		this.WindDirection = values[3];
		this.RelativeHumidity = values[4];
		this.DewPoint = values[5];
		this.Rain = values[6];
		this.RainIntensity = values[7];
		this.SnowDepth = values[8];
		this.Pressure = values[9];
		this.Visibility = values[10];
		this.Cloudness = values[11];
		this.Weather = values[12];
	}
}

const sundataUrl = 'https://api.sunrisesunset.io/json';
const sundataQueryParams = {
	lat: 61.5,
	lng: 23.5
};
class SunData {
	constructor(json) {
		this.date	       = new Date(json['date']);
		this.sunrise	   = this.#toDate(this.date, json['sunrise']);
		this.sunset	     = this.#toDate(this.date, json['sunset']);
		this.first_light = this.#toDate(this.date, json['first_light']);
		this.last_light	 = this.#toDate(this.date, json['last_light']);
		this.dawn	       = this.#toDate(this.date, json['dawn']);
		this.dusk	       = this.#toDate(this.date, json['dusk']);
		this.solar_noon	 = this.#toDate(this.date, json['solar_noon']);
		this.golden_hour = this.#toDate(this.date, json['golden_hour']);
		this.day_length	 = this.#toSeconds(json['day_length']);
		this.timezone    = json['timezone'];
		this.utc_offset  = +json['utc_offset'];
	}

	isDarkNow() {
		const now = new Date();
		return now < this.dawn || this.dusk < now;
	}

	getTimeToDusk() {
		return this.dusk - new Date();
	}

	isTodaysData() {
		const now = new Date();
		return now.getDate() === this.date.getDate()
				&& now.getMonth() === this.date.getMonth()
				&& now.getYear() === this.date.getYear();
	}

	#toDate(date, timeString) {
		const ts = timeString.split(' ')[0];
		const p = ts.split(':');
		return new Date(date.getYear(), date.getMonth(), date.getDate(), +p[0], +p[1], +p[2]);
	}

	#toSeconds(str) {
		const p = str.split(':');
		return ((+p[0] * 60) + +p[1]) * 60 + +p[2];
	}
}

// FUNCTIONS

async function fetchSunData() {
	const params = [];
	for (var key in sundataQueryParams) {
		params.push(`${key}=${sundataQueryParams[key]}`);
	}

	const url = sundataUrl + "?" + params.join('&');

	try {
		const response = await fetch(url);
		const json = await response.json();
		if (json['status'] === 'OK') {
			return json['results'];
		}
		else {
			return null;
		}
	} catch (error) {
		return null;
	}
}

async function fetchWeatherData() {
	const params = [];
	for (var key in weatherQueryParams) {
		params.push(`${key}=${weatherQueryParams[key]}`);
	}

	const url = weatherUrl + "?" + params.join('&');

	try {
		const response = await fetch(url);
		const text = await response.text();
		return xmlParser.parse(text);
	} catch (error) {
		return null;
	}
}

function sequenceToWeatherStationDataArray(dataString) {
	const recordStrings = dataString.split('\n').map(line => line.trim());

	const result = [];
	for (let i = 0; i < recordStrings.length; i += 1) {
		const values = recordStrings[i].split(' ').map(s => +s);
		result.push(new WeatherStationData(values));
	}

	return result;
}

async function fetchAuroraData(url) {
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


async function getAuroraStations(data) {
	const result = {};
	if (!data['info'] || !data['data'])
		return null;

	for (const id in data['data']) {
		result[id] = AuroraStation.fromJson(data['data'][id]);
	}

	return result;
}


async function getAuroraStationRIndex(station, dataTree) {
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


async function checkAurora() {
	hasDisplayedNotification = false;

	const data = await fetchAuroraData(auroraUrl);
	if (data === null) {
		return STATUS_ERROR_FETCH;
	}

	const stations = await getAuroraStations(data);
	if (stations === null) {
		log('format', data);
		return STATUS_ERROR_FORMAT;
	}
	
	const station = stations[AURORA_STATION_NAME];

	const { stationName,  rIndex } = await getAuroraStationRIndex(station, ['RX', 'value']);

	let message = '';
	let showAsNotification = false;

	if (rIndex === undefined) {
		log('station', data);
		return STATUS_ERROR_NO_STATION;
	}
	else if (rIndex === null) {
		log('parse', data);
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

async function checkCloudness() {
	const weatherXml = await fetchWeatherData();
	if (weatherXml === null) {
		return { status: STATUS_ERROR_FETCH };
	}

	try {
		const observations = weatherXml['wfs:FeatureCollection']['wfs:member']['omso:GridSeriesObservation'];
		const date = new Date(observations['om:resultTime']['gml:TimeInstant']['gml:timePosition']);

		const dataString = observations['om:result']['gmlcov:MultiPointCoverage']['gml:rangeSet']['gml:DataBlock']['gml:doubleOrNilReasonTupleList'];
		const weatherArray = sequenceToWeatherStationDataArray(dataString);
		const weatherData = weatherArray.at(-1);

		return { status: STATUS_OK, cloudness: weatherData.Cloudness, date };

	} catch {
		log('format', weatherXml);
		return { status: STATUS_ERROR_FORMAT };
	}
};

async function getSunData() {
	const sunDataJson = await fetchSunData();
	if (sunDataJson === undefined) {
		return { status: STATUS_ERROR_FETCH };
	}

	const sunData = new SunData(sunDataJson);
	return { status: STATUS_OK, data: sunData };
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
	writeFile('log.txt', `${dateFormat(new Date(), "yyyy-mm-dd HH:MM")} ${message} ${data}\n`, {
		encoding: 'utf8',
		flag: 'a'
	}, (err) => {
		if (err) {
			console.log('Failed to save data in the log file.');
		}
	});
}

function printAuroraQueryStatus(status) {
	let message = null;
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
			message = `Station "${AURORA_STATION_NAME}" is off or does not exist`;
			break;
		case STATUS_ERROR_PARSE:
			message = 'Unexpected station data format';
			break;
		default:
			message = 'Unknown error';
			break;
	}

	if (message) {
		console.error(`${dateFormat(new Date(), "HH:MM")} Error ${status}: ${message}`);
	}
}


function cycle() {
	if (sunData === null) {
		const time = dateFormat(new Date(), "HH:MM");
		console.log(`${time} Checking sun data...`);
		getSunData()
			.then(({status, data}) => {
				if (status === STATUS_OK) {
					sunData = data;

					const interval = !sunData.isDarkNow()
						? sunData.getTimeToDusk()
						: INTERVAL_FIRST_TIME_CHECK_MS;

					setTimeout(cycle, interval);

					if (!sunData.isDarkNow()) {
						console.log(`${time} It is not yet dark, continue the service when the night comes.`);
					}
				}
				else {
					setTimeout(cycle, INTERVAL_RETRY_ON_ERROR_MS);
				}
			})
			.catch((error) => {
				console.error('Issues with fething sun data: ' + error);
			});
	}
	else if (!sunData.isDarkNow() || !sunData.isTodaysData()) {
		sunData = null;
		setTimeout(cycle, INTERVAL_FIRST_TIME_CHECK_MS);
	}
	else {
		checkCloudness()
			.then(async ({status, cloudness, date}) => {
				const time = date
					? dateFormat(date, "HH:MM") 
					: dateFormat(new Date(), "HH:MM");

				if (status !== STATUS_OK) {
					console.error(`${time} Failed to obtain weather station data`);
					return { source: SOURCE_WEATHER, status };
				}
				else if (cloudness <= 4) {
					const message = cloudness < 2
						? 'The sky is clear.'
						: 'The sky is somewaht cloudy.';

					console.log(`${time} ${message}`);

					await new Promise(() => setTimeout(() => { }, 3000) );

					const status = await checkAurora();
					return { source: SOURCE_AURORA, status };
				}
				else {
					console.log(`${time} Too cloudy to check auroras (${cloudness} / 8)`);
					return { source: SOURCE_WEATHER, status: STATUS_OK };
				}
			})
			.then(({source, status}) => {
				if (source === SOURCE_AURORA) {
					printAuroraQueryStatus(status);
					return status === STATUS_OK
						? INTERVAL_AURORA_MS
						: INTERVAL_RETRY_ON_ERROR_MS;
				}
				else if (source === SOURCE_WEATHER) {
					return status === STATUS_OK
						? INTERVAL_WEATHER_MS		// cloudness changes not very rapidly
						: INTERVAL_RETRY_ON_ERROR_MS;
				}
			})
			.then((interval) => {
				setTimeout(cycle, interval);
			})
			.catch((error) => {
				console.error('Issues with fething aurora or cloudness data: ' + error);
			});
	}
}


// MAIN EXECUTION

let timeoutlHandle = 0;
let hasDisplayedNotification = false;
let sunData = null;

console.log('Aurora Alarm is running. Press Ctrl+C to exit.');

cycle();

if (!hasDisplayedNotification) {
	showMessage('Started', `Checking the aurora status every ${INTERVAL_AURORA_MIN} minutes...`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearTimeout(timeoutlHandle);
    process.exit(0);
});
