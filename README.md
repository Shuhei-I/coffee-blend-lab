# Coffee Blend Lab

Coffee Blend Lab is a local web app for designing coffee blends, managing bean and brew-method masters, and saving recipe versions with tasting notes.

## Features

- Create blends from registered coffee beans and adjust each bean ratio.
- Calculate blend profile, dose, target brew amount, and estimated cost.
- Manage bean masters with tasting profile values and cost per kg.
- Manage brew-method masters with pour percentages and bloom time.
- Save blend recipes as versioned series.
- Record cupping scores and tasting memos.
- Export saved recipes as JSON or CSV.
- Store data in browser localStorage by default, or in SQLite when the local API server is running.

## Tech Stack

- React
- Vite
- Node.js HTTP server
- SQLite via `node:sqlite`

## Requirements

- Node.js with `node:sqlite` support
- npm

## Setup

```powershell
npm install
```

## Development

Run the SQLite API server:

```powershell
npm run dev:server
```

In another terminal, run the Vite dev server:

```powershell
npm run dev
```

Open the URL shown by Vite, usually:

```text
http://127.0.0.1:5173
```

The frontend calls the API at:

```text
http://127.0.0.1:4174
```

If the API server is not running, the app still works with browser localStorage.

## Build

```powershell
npm run build
```

## Preview

```powershell
npm run preview
```

## Data

SQLite data is created under `data/` when `npm run dev:server` is running. The directory is ignored by Git because it contains local application data.

## Repository

```text
https://github.com/Shuhei-I/coffee-blend-lab
```
