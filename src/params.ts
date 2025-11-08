let WEATHER_STATION_NAME = 'Helsinki';  // Default weather station

process.argv.slice(2).forEach(val => {
  if (val.startsWith('--station=')) {
    const parts = val.split('=');
    WEATHER_STATION_NAME = parts[1];
  }
  else if (val.startsWith('--help')) {
    console.log('Usage:');
    console.log('  --station=<station name>   Set the FMI weather station name (default: Helsinki).');
    console.log('    Check https://en.ilmatieteenlaitos.fi/observation-stations for valid station names.');
    process.exit(0);
  }
  else if (val.startsWith('--')) {
    console.warn(`Unknown parameter: ${val}`);
  }
});

export {
  WEATHER_STATION_NAME
}