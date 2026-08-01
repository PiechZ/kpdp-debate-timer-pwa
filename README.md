# Debate timer

## CLI Commands
*   `npm install`: Installs dependencies

*   `npm start`: Run a development, HMR server

*   `npm run serve`: Run a production-like server

*   `npm run build`: Production-ready build

*   `npm run lint`: Pass TypeScript files using ESLint

For detailed explanation on how things work, checkout the [CLI Readme](https://github.com/developit/preact-cli/blob/master/README.md).

## Running on Windows

`npm start` / `npm run build` are defined in `package.json` using the Unix inline env-var
syntax (`NODE_OPTIONS=--openssl-legacy-provider preact build ...`). On Windows, `npm` runs
scripts through `cmd.exe`, which can't parse that syntax and fails with a syntax error before
preact-cli even starts. `npm test` and `npm run lint` don't set an env var this way, so they're
unaffected and work as-is.

To run the dev server or build, set the env var yourself and call `preact` directly:

**PowerShell**
```powershell
$env:NODE_OPTIONS = "--openssl-legacy-provider"
npx preact watch -p 8081      # dev server, http://localhost:8081
npx preact build --dest build # production build
```

**Git Bash**
```bash
export NODE_OPTIONS=--openssl-legacy-provider
npx preact watch -p 8081
npx preact build --dest build
```

Everything else (`npm install`, `npm test`, `npm run lint`) runs the same as on any other OS.

## Changing server subfolder
To change subfolder that the app is served from, edit:
* `preact.config.js`: line `13`, `const productionSubfolder`
* `src/manifest.json`: lines `4` and `5`, `start_url` and `scope`
* `src/static/.htaccess`: lines `4` and `9`, `RewriteBase` and `RewriteRule`
* `package.json`: line `7`, `preact build --dest` option
* `.gitignore`: lines `4` and `5`
