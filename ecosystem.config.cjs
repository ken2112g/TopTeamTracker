// PM2 Ecosystem Config — TopTeamTracker Harvest Daemon
// Chạy: source .env && pm2 start ecosystem.config.cjs
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'etsypulse-harvest',
      script: 'services/harvest-daemon.mjs',
      args: '--daemon',

      // Môi trường
      env: {
        NODE_ENV:             'production',

        ETSYPULSE_API_URL:    process.env.ETSYPULSE_API_URL   ?? 'https://topteamtracker.id.vn',
        HARVEST_TOKEN:        process.env.HARVEST_TOKEN        ?? '',  // lấy từ Admin Panel → Workspace
        HEYETSY_EXT_PATH:     process.env.HEYETSY_EXT_PATH    ?? '',  // VD: C:\heyetsy-ext
        PROFILES_DIR:         process.env.PROFILES_DIR        ?? './chrome-profiles',
        N_WORKERS:            process.env.N_WORKERS            ?? '3',
        DELAY_MS:             process.env.DELAY_MS             ?? '5000',
        HEYETSY_TIMEOUT_MS:   process.env.HEYETSY_TIMEOUT_MS  ?? '12000',
        HARVEST_HOUR:         process.env.HARVEST_HOUR         ?? '2',
        HARVEST_MINUTE:       process.env.HARVEST_MINUTE       ?? '0',
      },

      // Logs
      log_date_format:  'YYYY-MM-DD HH:mm:ss',
      out_file:         'logs/harvest-out.log',
      error_file:       'logs/harvest-error.log',
      merge_logs:       true,

      // Restart policy
      autorestart:      true,
      max_restarts:     5,
      restart_delay:    60_000,    // chờ 1 phút trước khi restart
      min_uptime:       '10s',

      // Không watch file changes (production)
      watch:            false,
    },
  ],
};
