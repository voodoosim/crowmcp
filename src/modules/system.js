// 시스템 관련 도구들
import os from 'os';

export const systemTools = [
  {
    name: "hello_world",
    description: "🌍 MCP 서버 연결 및 상태 확인",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", default: "Developer", description: "사용자 이름" }
      }
    }
  },
  {
    name: "system_status",
    description: "💻 서버 및 시스템 상태 모니터링",
    inputSchema: {
      type: "object",
      properties: {
        detailed: { type: "boolean", default: false, description: "상세 정보 포함 여부" }
      }
    }
  }
];

export async function handleSystem(toolName, args) {
  switch (toolName) {
    case "hello_world":
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      return {
        message: `🌍 안녕하세요, ${args.name || 'Developer'}님!`,
        server: "Ultimate Dev Assistant v3",
        status: "🟢 정상 작동 중",
        uptime: `${hours}시간 ${minutes}분 ${seconds}초`,
        timestamp: new Date().toISOString(),
        features: [
          "📁 파일 시스템 관리",
          "🔴 Redis 캐시",
          "📋 Notion 연동",
          "📚 Ref 문서 검색",
          "💻 시스템 모니터링"
        ]
      };

    case "system_status":
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();

      const basicInfo = {
        platform: os.platform(),
        node_version: process.version,
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          system_free: Math.round(freeMem / 1024 / 1024 / 1024 * 10) / 10,
          system_total: Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10
        },
        uptime: Math.floor(process.uptime()),
        active_sessions: global.activeSessions || 0
      };

      if (args.detailed) {
        return {
          ...basicInfo,
          detailed: {
            cpu: os.cpus(),
            load_average: os.loadavg(),
            network_interfaces: os.networkInterfaces(),
            environment: {
              pwd: process.cwd(),
              pid: process.pid,
              node_path: process.execPath
            },
            memory_detail: {
              rss: Math.round(memUsage.rss / 1024 / 1024),
              heap_used: Math.round(memUsage.heapUsed / 1024 / 1024),
              heap_total: Math.round(memUsage.heapTotal / 1024 / 1024),
              external: Math.round(memUsage.external / 1024 / 1024),
              array_buffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
            }
          }
        };
      }

      return {
        status: "💻 시스템 상태",
        info: `🖥️ 플랫폼: ${basicInfo.platform}
🟢 Node.js: ${basicInfo.node_version}
💾 메모리: ${basicInfo.memory.used}MB / ${basicInfo.memory.total}MB
⏱️ 업타임: ${basicInfo.uptime}초
🌐 활성 세션: ${basicInfo.active_sessions}개`,
        detailed_info: args.detailed ? "상세 정보가 포함되었습니다" : "detailed: true로 상세 정보 확인 가능"
      };

    default:
      return {
        success: false,
        error: `알 수 없는 도구: ${toolName}`
      };
  }
}
