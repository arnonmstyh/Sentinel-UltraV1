# Sentinel Dashboard - AIT SOC

A professional Security Operations Center (SOC) platform for cyber security incident detection, analysis, investigation, and containment management.

## Features

- **Incident Management** - Create, track, triage, and resolve security incidents with full lifecycle support
- **Threat Map** - Interactive geospatial visualization of threat origins and attack vectors
- **SSL Certificate Monitor** - Automated SSL/TLS certificate expiry tracking and alerts
- **AI Companion** - Integrated AI assistant for security analysis and recommendations
- **Reports & Analytics** - Severity distribution, attack vector graphs, responder leaderboards, and KPI dashboards
- **Role-Based Access** - Authentication with session management and rate limiting

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, React Leaflet

**Backend:** Express 5, Sequelize, SQLite3, Helmet, PM2

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```sh
# Install dependencies
npm install

# Start development (frontend + backend)
npm run start:dev

# Or start separately
npm run dev        # Frontend on :8080
npm run start      # Backend on :3001
```

### Production Build

```sh
npm run build
npm run start
```

## Project Structure

```
src/
  components/     # React components (UI + dashboard)
  pages/          # Application pages
  context/        # Auth & data providers
  hooks/          # Custom React hooks
  lib/            # Utilities
  types/          # TypeScript definitions
server/
  middleware/     # Express middleware
  index.js        # API server entry point
public/           # Static assets
```

## License

Proprietary - AIT SOC
