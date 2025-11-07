const URL = 'https://api.sunrisesunset.io/json';
const QUERY_PARAMS: Record<string, string | number> = {
	lat: 61.5,
	lng: 23.5,
	time_format: "24"
};

class SunData {
	date: Date;
	sunrise: Date;
	sunset:	Date;
	first_light:	Date;
	last_light:	Date;
	dawn:	Date;
	dusk:	Date;
	solar_noon:	Date;
	golden_hour:	Date;
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
		return now < this.dawn || this.dusk < now;
	}

	getTimeToDusk() {
		return this.dusk.getTime() - new Date().getTime();
	}

	isTodaysData() {
		const now = new Date();
		return now.getUTCDate() === this.date.getUTCDate()
				&& now.getUTCMonth() === this.date.getUTCMonth()
				&& now.getUTCFullYear() === this.date.getUTCFullYear();
	}

  // Internal

	#toDate(date: Date, timeString: string) {
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