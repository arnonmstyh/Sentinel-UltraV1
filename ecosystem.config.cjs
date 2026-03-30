module.exports = {
  apps: [
    {
      name: 'sentinel-dashboard',
      script: 'node',
      args: 'index.js',
      cwd: '/home/ddpm/Downloads/Sentinel-Dashboard-master/server',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

