module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: '/var/www/medical-pro-backend',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs', 'dist'],
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: '/var/www/medical-pro/logs/backend-error.log',
      out_file: '/var/www/medical-pro/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    },
    {
      name: 'frontend',
      cwd: '/var/www/medical-pro',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none'
      },
      error_file: '/var/www/medical-pro/logs/frontend-error.log',
      out_file: '/var/www/medical-pro/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    },
    {
      name: 'admin',
      cwd: '/var/www/medical-pro-admin',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
        BROWSER: 'none'
      },
      error_file: '/var/www/medical-pro/logs/admin-error.log',
      out_file: '/var/www/medical-pro/logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    },
    {
      name: 'mailhog',
      script: 'mailhog',
      instances: 1,
      exec_mode: 'fork',
      env: {},
      error_file: '/var/www/medical-pro/logs/mailhog-error.log',
      out_file: '/var/www/medical-pro/logs/mailhog-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};
