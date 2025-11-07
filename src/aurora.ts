const STATION_NAME = 'NUR';
const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

const URL = 'https://space.fmi.fi/MIRACLE/RWC/data/RX_latest_en.json';

class Observation {
  value: number;
  level: string;

  constructor(json: any) {
    this.value = json['value'];
    this.level = json['activity level'];
  }
}

class AuroraStation {
  time: string;
  RX: Observation;
  RXmin: Observation;
  RXmax: Observation;
  name: string;

  constructor(json: any) {
    this.time = new Date().toString();
    this.RX = new Observation(json['RX']);
    this.RXmin = new Observation(json['RXmin']);
    this.RXmax = new Observation(json['RXmax']);
    this.name = json['station'];
  }

  isRIndexHigh() {
    return this.RX.value > R_INDEX_THRESHOLD_HIGH;
  }

  isRIndexMedium() {
    return this.RX.value > R_INDEX_THRESHOLD_MEDIUM;
  }
}

type Stations = Record<string, AuroraStation>;

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
    const station = stations[STATION_NAME];
    return station;
  }
}

// EXPORTS

export {
  Aurora,
  AuroraStation
}