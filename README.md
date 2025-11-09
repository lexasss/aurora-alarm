# Aurora Alarm

Shows an alert when there is a high chance of observing auroras at a give location.
Works only for locatios in Finland.

## Features

- checks the sunlight: no aurora checks occur while the sky is not dark
- checks the cloudness: no aurora checks occur while the sky is mostly cloudy
- checks auroras every 10 minutes and display a Windows notification message if there are some chances to observe auroras

## Running

This a command-line tool to run with NodeJS:

``` bash
node .\src\index.ts <args>
```

Arguments:

``` bash
  -s, --station=<station name>   Set the FMI weather station name (default: Pirkkala).
  -c, --consoleOnly              Run in console mode without GUI notifications.
```

Check [FMI station list](https://en.ilmatieteenlaitos.fi/observation-stations) for valid station names.

Note that the NodeJS version must be at least v22.18.0 to run the TypeScript code natively, as shown above.
