// ── 应用入口 ──
import { createApp } from "./app.js";
import { config } from "./config.js";
import os from "os";

const app = createApp();

app.listen(config.port, config.bindAddress, () => {
  const localUrl = `http://localhost:${config.port}`;
  console.log(`🚀 服务已启动: ${localUrl}`);

  if (config.isProduction) {
    // 列出本机局域网 IP
    const ips = getLocalIPs();
    console.log("📱 手机访问地址：");
    ips.forEach((ip) => console.log(`   http://${ip}:${config.port}`));
    console.log(`📋 API 健康检查: ${localUrl}/api/health`);
  } else {
    console.log(`📋 健康检查: ${localUrl}/api/health`);
  }
});

/** 获取本机局域网 IPv4 地址 */
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const [, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      if (addr.family === "IPv4" && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}
