module.exports = {
  apps: [
    {
      name: 'geopunch-backend',
      script: 'dist/src/main.js',
      cwd: '/root/.openclaw/workspaces/coordinator/GeoPunch-project/attendance-system',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: 'mysql://root:@127.0.0.1:3306/geopunch',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_SECRET: 'test-secret-key-for-development',
        ATTENDANCE_WORK_START: '09:00',
        ATTENDANCE_WORK_END: '18:00',
        TZ: 'Asia/Shanghai',
      },
    },
  ],
};
