import { XMLParser } from 'fast-xml-parser';

const STATION_NAME = 'Pirkkala';

const URL = "https://opendata.fmi.fi/wfs";
const QUERY_PARAMS = {
  service: "WFS",
  version: "2.0.0",
  request: "getFeature",
  storedquery_id: "fmi::observations::weather::multipointcoverage",
  place: STATION_NAME
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

class Weather {
  static async fetch() {
    const params = [];
    for (var key in QUERY_PARAMS) {
      params.push(`${key}=${QUERY_PARAMS[key]}`);
    }

    const url = URL + "?" + params.join('&');

    try {
      const response = await fetch(url);
      const text = await response.text();
      return xmlParser.parse(text);
    } catch (error) {
      return null;
    }
  }

  static getLastObservation(weatherXml) {
		const observations = weatherXml['wfs:FeatureCollection']['wfs:member']['omso:GridSeriesObservation'];
		const date = new Date(observations['om:resultTime']['gml:TimeInstant']['gml:timePosition']);

		const dataString = observations['om:result']['gmlcov:MultiPointCoverage']['gml:rangeSet']['gml:DataBlock']['gml:doubleOrNilReasonTupleList'];
		const weatherArray = Weather.#sequenceToWeatherStationDataArray(dataString);
		const weatherData = weatherArray.at(-1);

    return { date, weatherData };
  }

  static #sequenceToWeatherStationDataArray(dataString) {
    const recordStrings = dataString.split('\n').map(line => line.trim());

    const result = [];
    for (let i = 0; i < recordStrings.length; i += 1) {
      const values = recordStrings[i].split(' ').map(s => +s);
      result.push(new WeatherStationData(values));
    }

    return result;
  }

}

const xmlParser = new XMLParser();

// EXPORTS

export {
  Weather
}