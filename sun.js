const URL = 'https://api.sunrisesunset.io/json';
const QUERY_PARAMS = {
	lat: 61.5,
	lng: 23.5,
	time_format: "24"
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
				&& now.getFullYear() === this.date.getFullYear();
	}

  // Internal

	#toDate(date, timeString) {
		const p = timeString.split(':');
		return new Date(date.getFullYear(), date.getMonth(), date.getDate(), +p[0], +p[1], +p[2]);
	}

	#toSeconds(str) {
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

	static toObject(json) {
		return new SunData(json);
	}
}

// EXPORT

export {
  Sun
}