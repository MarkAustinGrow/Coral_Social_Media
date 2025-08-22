module.exports = {
  apps: [
    {
      name: "coral-social-media",
      cwd: "./Web_Interface",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "500M",
      restart_delay: 3000,
      autorestart: true
    }
  ]
}
