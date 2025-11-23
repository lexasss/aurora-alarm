# Aurora Alarm

Shows an alert when there is a high chance of observing auroras at a give location.
Works only for locatios in Finland.

## Features

- checks the sunlight: no aurora checks occur while the sky is not dark
- checks the cloudness: no aurora checks occur while the sky is mostly cloudy
- checks auroras every 10 minutes and display a Windows notification message if there are some chances to observe auroras

## Running

This a command-line tool to run with NodeJS:

``` text
node .\src\index.ts <args>
```

Arguments:

``` text
  -s, --station=<station name>   Set the FMI weather station name (default: Pirkkala).
  -l, --list                     Lists all valid station names
  -c, --guiless                  GUI notifications are suppressed, console-only mode.
```

Additionally, you can check [FMI station list](https://en.ilmatieteenlaitos.fi/observation-stations) for valid station names.

Note that the NodeJS version must be at least v22.18.0 to run the TypeScript code natively, as shown above.

## TS > JS

If you prefer to run JavaScript code instead of TypeScript, you need to execute the following steps:

1. rename `.ts` to `.js` in all imports
2. edit these fields in `compilerOptions` section of `tscondig.json` file:
    - set `allowImportingTsExtensions` to `false`
    - remove `noEmit`
3. optionally, remove all `*.tsbuildinfo` files from the root folder
4. run `npm run build`

The JavaScript code is located in `.\dist\` folder now. You can tun it with `node .\src\index.js <args>`.
