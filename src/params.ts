import { parseArgs } from "node:util";

class Parameters {
  station: string = 'Helsinki';
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
        default: 'Helsinki',
      },
      consoleOnly: {
        type: "boolean",
        short: "c",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
  });

  parameters = values as Parameters;

} catch (error: any) {
  console.error('Error parsing command line arguments: ' + error.message);
}

if (parameters.help) {
  console.log('Usage:');
  console.log('  --station=<station name>   Set the FMI weather station name (default: Helsinki).');
  console.log('    Check https://en.ilmatieteenlaitos.fi/observation-stations for valid station names.');
  console.log('  --consoleOnly              Run in console mode without notifications.');
  process.exit(0);
}

export {
  parameters
}