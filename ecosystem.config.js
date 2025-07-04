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
  }]
}
