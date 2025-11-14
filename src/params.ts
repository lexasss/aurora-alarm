import { parseArgs } from "node:util";

class Parameters {
  station: string = 'Pirkkala';
  guiless: boolean = false;
  list: boolean = false;
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
      list: {
        type: "boolean",
        short: "l",
        default: parameters.list,
      },
      help: {
        type: "boolean",
        short: "h",
        default: parameters.help,
      },
    },
  });

  parameters = values as Parameters;
  parameters.station = parameters.station.replace(/_/g, ' ');

} catch (error: any) {
  console.error('Error parsing command line arguments: ' + error.message);
}

if (parameters.help) {
  console.log('Usage:');
  console.log('  -s, --station=<name>   Set the FMI weather station name (default: Helsinki).');
  console.log('  -l, --list             Prints out FMI weather stations that measure cloudness.');
  console.log('  -c, --guiless          GUI notifications are suppressed, runs in console-only mode.');
}

export {
  parameters
}