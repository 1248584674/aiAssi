// PM2 进程守护配置
module.exports = {
  apps: [{
    name: "ai-assistant",
    script: "npx",
    args: "tsx apps/api/src/main.ts",
    interpreter: "none",  // npx 不需要 Node 解释器
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
    },
    // 自动重启
    autorestart: true,
    max_restarts: 10,
    // 日志
    error_file: "./logs/error.log",
    out_file: "./logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    // 内存限制
    max_memory_restart: "500M",
    // 监听文件变化（生产环境建议关闭）
    watch: false,
  }],
};