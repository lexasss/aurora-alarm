import { Location } from './common.ts';

const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

/*/ Simplified version

const URL = 'https://space.fmi.fi/MIRACLE/RWC/data/RX_latest_en.json';

class AuroraStation {
  time: Date;
  RX: Observation;
  RXmin: Observation;
  RXmax: Observation;
  probability: string;
  name: string;

  constructor(json: any) {
    this.time = new Date();
    this.RX = +(json['RX']['value']);
    this.RXmin = +(json['RXmin']['value']);
    this.RXmax = +(json['RXmax']['value']);
    this.RX = json['RX']['activity level'];
    this.name = json['station'];
  }

  isRIndexHigh() {
    return this.RX.value > R_INDEX_THRESHOLD_HIGH;
  }

  isRIndexMedium() {
    return this.RX.value > R_INDEX_THRESHOLD_MEDIUM;
  }
}
*/

// Full version

const URL = 'https://space.fmi.fi/MIRACLE/RWC/data/r_index_latest_en.json';

class AuroraStation {
  time: Date;
  RX: number;
  RXmin: number;
  RXmax: number;
  lattitude: number;
  longitude: number;
  probability: string;
  name: string;

  constructor(json: any) {
    this.time = new Date(json['Time']);
    this.RX = +json['R-index'];
    this.RXmin = +json['Limit value lower'];
    this.RXmax = +json['Limit value higher'];
    this.lattitude = +json['Geographic latitude'];
    this.longitude = +json['Geographic longitude'];
    this.probability = json['Probability of auroras'].split(' ')[0];
    this.name = json['Station'];
  }

  isRIndexHigh() {
    return this.RX > R_INDEX_THRESHOLD_HIGH;
  }

  isRIndexMedium() {
    return this.RX > R_INDEX_THRESHOLD_MEDIUM;
  }
}

type Stations = Record<string, AuroraStation>;

let _stationName: string = '';

class Aurora {
  static async fetch() {
    let data: any = null;
    try {
      const response = await fetch(URL);
      const json = await response.text();
      data = JSON.parse(json);
    } catch (error) {
      return null;
    }
    return data;
  }

  static getStations(data: any) {
    const stations: Stations = {};
    if (!data['info'] || !data['data'])
      return null;

    for (const id in data['data']) {
      stations[id] = new AuroraStation(data['data'][id]);
    }

    return stations;
  }

  static getStation(stations: Stations) {
    if (!_stationName) {
      _stationName = Aurora.#findNearestStation(stations, Location.lattitude, Location.longitude);
    }

    const station = stations[_stationName];
    return station;
  }

  // Internal

  static #findNearestStation(stations: Stations, latitude: number, longitude: number) {
    let result: string = '';
    let minDistance = Number.MAX_VALUE;
    for (const id in stations) {
      const station = stations[id];
      const distance = Math.sqrt(
        (station.lattitude - Location.lattitude) ** 2 +
        (station.longitude - Location.longitude) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        result = id;
      }
    }
    return result;
  }
}

// EXPORTS

export {
  Aurora,
  AuroraStation
}