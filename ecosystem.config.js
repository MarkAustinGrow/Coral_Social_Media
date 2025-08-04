module.exports = {
  apps: [{
    name: 'coral-web',
    script: 'npm',
    args: 'start',
    cwd: './Web_Interface',
    env_file: './.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    watch: false,
    ignore_watch: ['node_modules', '.next'],
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: './logs/coral-web-error.log',
    out_file: './logs/coral-web-out.log',
    log_file: './logs/coral-web-combined.log',
    time: true
  }, {
    name: 'coral-studio-bridge',
    script: './coral-studio-server.js',
    env_file: './.env',
    env: {
      NODE_ENV: 'production',
      CORAL_STUDIO_PORT: 3001,
      HOST: '0.0.0.0'
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    error_file: './logs/coral-studio-error.log',
    out_file: './logs/coral-studio-out.log',
    log_file: './logs/coral-studio-combined.log',
    time: true
  }]
}
