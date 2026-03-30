# How to Start the Sentinel Dashboard (with SSL Monitor)

This project contains both a React frontend and a Node.js backend.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher) installed on your system.

## Setup (First Time Only)

1.  Open your terminal (Command Prompt, PowerShell, or Terminal).
2.  Navigate to the project root directory.
3.  Install dependencies for the frontend:
    ```bash
    npm install
    ```
4.  Install dependencies for the backend:
    ```bash
    cd server
    npm install
    cd ..
    ```

## How to Start

To run both the frontend and backend with a single command:

1.  Open your terminal in the project root.
2.  Run:
    ```bash
    npm start
    ```

This command will:
- Start the Frontend (Vite) on `http://localhost:8080` (or similar).
- Start the Backend (Node.js) on `http://localhost:3001`.

## Troubleshooting

- **Port In Use**: If you see an error about port 3001 or 8080 being in use, ensure no other instances of the app are running.
- **CSP Errors**: If you see "Refused to connect", make sure you are accessing the dashboard via the URL shown in the terminal (usually localhost).
