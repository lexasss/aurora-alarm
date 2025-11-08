# Auroral Alarm

Shows an alert when there is a high chance of observing auroras.
Works only in Finland.

## Running

This a command-line tool to run with NodeJS:

```
node .\src\index.ts <args>
```

Arguments:
`--station=<FMI_weather_station>` (default is Helsinki)

Note that:
- the NodeJS version must be at least v22.18.0 to run the TypeScript code natively, as shown above.

## Features

- checks the sunlight: no aurora checks occur while the sky is not dark
- checks the cloudness: no aurora checks occur while the sky is mostly cloudy
- checks auroras every 10 minutes and display a Windows notification message if there are some chances to observe auroras
