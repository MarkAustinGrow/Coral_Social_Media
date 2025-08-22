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
    },
    {
      name: "interface-agent",
      script: "./0_langchain_interface.py",
      interpreter: "python",
      env: {
        PYTHONUNBUFFERED: "1"
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1G",
      restart_delay: 5000,
      autorestart: true
    }
  ]
}
