const fs = require("node:fs");
const path = require("node:path");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return env;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key) {
        env[key] = value;
      }

      return env;
    }, {});
}

const ecsEnv = parseEnvFile(path.join(__dirname, ".env.ecs"));

module.exports = {
  apps: [
    {
      name: "tradepilot-ecs-api",
      cwd: __dirname,
      script: "./server.js",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        ...ecsEnv,
      },
    },
  ],
};
