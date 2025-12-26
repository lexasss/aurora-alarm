import { Location } from './common.ts';

const URL = 'https://api.sunrisesunset.io/json';
const QUERY_PARAMS: Record<string, string | number> = {
	lat: 0,		// to be set
	lng: 0,		// to be set
	time_format: "24"
};

class SunData {
	date: Date;
	sunrise: Date | null;
	sunset:	Date | null;
	first_light:	Date | null;
	last_light:	Date | null;
	dawn:	Date | null;
	dusk:	Date | null;
	solar_noon:	Date | null;
	golden_hour:	Date | null;
	day_length: number;
	timezone: string;
	utc_offset: number;

	constructor(json: any) {
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
		return !this.dawn || !this.dusk ? false : now < this.dawn || this.dusk < now;
	}

	getTimeToDusk() {
		if (!this.dusk) {
			return 12 * 60 * 60 * 1000;	// 12 hours
		}
		return this.dusk.getTime() - new Date().getTime();
	}

	isTodaysData() {
		const now = new Date();
		return now.getUTCDate() === this.date.getUTCDate()
				&& now.getUTCMonth() === this.date.getUTCMonth()
				&& now.getUTCFullYear() === this.date.getUTCFullYear();
	}

  // Internal

	#toDate(date: Date, timeString?: string) {
		if (!timeString) {
			return null;
		}

		const p = timeString.split(':');
		return new Date(date.getFullYear(), date.getMonth(), date.getDate(), +p[0], +p[1], +p[2]);
	}

	#toSeconds(str: string) {
		const p = str.split(':');
		return ((+p[0] * 60) + +p[1]) * 60 + +p[2];
	}
}

class Sun {

	static async fetch() {

		QUERY_PARAMS['lat'] = Location.lattitude;
		QUERY_PARAMS['lng'] = Location.longitude;

		const params = [];
		for (var key in QUERY_PARAMS) {
			params.push(`${key}=${QUERY_PARAMS[key]}`);
		}

		const url = URL + "?" + params.join('&');

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

	static toObject(json: any) {
		return new SunData(json);
	}
}

// EXPORT

export {
  Sun,
	SunData
}