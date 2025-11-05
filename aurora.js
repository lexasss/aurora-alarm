//import fetch from 'node-fetch';

const STATION_NAME = 'NUR';
const R_INDEX_THRESHOLD_HIGH = 280;
const R_INDEX_THRESHOLD_MEDIUM = 150;

const URL = 'https://space.fmi.fi/MIRACLE/RWC/data/RX_latest_en.json';

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

  isRIndexHigh() {
    this.RX.value > R_INDEX_THRESHOLD_HIGH;
  }

  isRIndexMedium() {
    this.RX.value > R_INDEX_THRESHOLD_MEDIUM;
  }
}

class Aurora {

  static async fetch() {
    let data = null;
    try {
      const response = await fetch(URL);
      const json = await response.text();
      data = JSON.parse(json);
    } catch (error) {
      return null;
    }
    return data;
  }

  static getStations(data) {
    const stations = {};
    if (!data['info'] || !data['data'])
      return null;

    for (const id in data['data']) {
      stations[id] = AuroraStation.fromJson(data['data'][id]);
    }

    return stations;
  }

  static getStation(stations) {
    const station = stations[STATION_NAME];
    return station;
  }
}

// EXPORTS

export {
  Aurora
}