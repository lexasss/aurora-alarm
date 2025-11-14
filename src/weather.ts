import { XMLParser } from 'fast-xml-parser';

import { parameters } from './params.ts';

const URL = "https://opendata.fmi.fi/wfs";
const QUERY_PARAMS: Record<string, string> = {
  service: "WFS",
  version: "2.0.0",
  request: "getFeature",
  storedquery_id: "fmi::observations::weather::multipointcoverage",
  place: parameters.station
};

class WeatherStationData {
    Temperature: number;
    WindSpeed: number;
    GustSpeed: number;
    WindDirection: number;
    RelativeHumidity: number;
    DewPoint: number;
    Rain: number;
    RainIntensity: number;
    SnowDepth: number;
    Pressure: number;
    Visibility: number;
    Cloudness: number;
    Weather: number;

  constructor(values: number[]) {
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
  static async fetch(stationName?: string) {
    const params = [];
    for (var key in QUERY_PARAMS) {
      if (key === 'place' && stationName) {
        params.push(`place=${stationName}`);
      }
      else {
        params.push(`${key}=${QUERY_PARAMS[key]}`);
      }
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

  static getLastObservation(weatherXml: any) {
		const observations = weatherXml['wfs:FeatureCollection']['wfs:member']['omso:GridSeriesObservation'];
		const date = new Date(observations['om:resultTime']['gml:TimeInstant']['gml:timePosition']);

    const dataBlock = observations['om:result']['gmlcov:MultiPointCoverage']['gml:rangeSet']['gml:DataBlock'];
		const dataString = dataBlock['gml:doubleOrNilReasonTupleList'];
		const weatherArray = Weather.#sequenceToWeatherStationDataArray(dataString);
		const weatherData = weatherArray.at(-1);

    return { date, weatherData };
  }

  static getLocation(weatherXml: any) {
    if (weatherXml['ExceptionReport'] || !weatherXml['wfs:FeatureCollection']) {
      return null;
    }

    const observations = weatherXml['wfs:FeatureCollection']['wfs:member']['omso:GridSeriesObservation'];
    const points = observations['om:featureOfInterest']['sams:SF_SpatialSamplingFeature']['sams:shape'];
    const location = points['gml:MultiPoint']['gml:pointMember']['gml:Point']['gml:pos'];
    
    const parts = location.split(' ').map((s: string) => +s);
    return { latitude: parts[0], longitude: parts[1] };
  }


  static async enumValidStations(callback: (name: string) => void) {
    const module = await import('./fmi-stations.ts');
    const stations = module.getCloudnessStations();

    for (const station of stations) {
      try {
        const s = await Weather.fetch(station); // Pre-fetch to verify station existence
        const { date, weatherData } = Weather.getLastObservation(s);
        if (!weatherData || weatherData.Cloudness === null || isNaN(weatherData.Cloudness)) {
          continue;
        }
        callback(station);
      } catch (error) { }
    }
  }

  // Internal

  static #sequenceToWeatherStationDataArray(dataString: string) {
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