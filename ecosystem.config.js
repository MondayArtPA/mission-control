module.exports = {
  apps: [
    {
      name: "mission-control",
      cwd: "/Users/Openclaw/.openclaw/workspace/mission-control",
      script: "node_modules/.bin/next",
      args: "dev -p 3001",
      env: {
        NODE_ENV: "development",
        PORT: "3001",
        MISSION_CONTROL_BASE_URL: "http://localhost:3001",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
