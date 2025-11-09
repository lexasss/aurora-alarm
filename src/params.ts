import { parseArgs } from "node:util";

class Parameters {
  station: string = 'Pirkkala';
  guiless: boolean = false;
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
      guiless: {
        type: "boolean",
        short: "c",
        default: parameters.guiless,
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
  console.log('  -c, --guiless                  GUI notifications are suppressed, console-only mode.');
  process.exit(0);
}

export {
  parameters
}