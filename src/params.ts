import { parseArgs } from "node:util";

class Parameters {
  station: string = 'Pirkkala';
  consoleOnly: boolean = false;
  help: boolean = false;
}

let parameters = new Parameters();

try {
  const {
    values
  } = parseArgs({
    options: {
      station: {
        type: "string",
        short: "s",
        default: parameters.station,
      },
      consoleOnly: {
        type: "boolean",
        short: "c",
        default: parameters.consoleOnly,
      },
      help: {
        type: "boolean",
        short: "h",
        default: parameters.help,
      },
    },
  });

  parameters = values as Parameters;

} catch (error: any) {
  console.error('Error parsing command line arguments: ' + error.message);
}

if (parameters.help) {
  console.log('Usage:');
  console.log('  -s, --station=<station name>   Set the FMI weather station name (default: Helsinki).');
  console.log('    Check https://en.ilmatieteenlaitos.fi/observation-stations for valid station names.');
  console.log('  -c, --consoleOnly              Run in console mode without GUI notifications.');
  process.exit(0);
}

export {
  parameters
}