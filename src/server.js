#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import Redis from 'redis';
import { registerAllTools, allTools } from './modules/index.js';
import dotenv from 'dotenv';

dotenv.config();

// 전역 설정
global.activeSessions = 0;
const sessionStats = {
  total: 0,
  active: 0,
  errors: 0
};

// Redis 클라이언트 설정
export const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Redis 재연결 실패');
      return retries * 100;
    },
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined
  }
});

// Redis 연결
redis.connect().catch(err => {
  console.error('❌ Redis 연결 실패:', err.message);
});

redis.on('connect', () => console.error('🔴 Redis 연결됨'));
redis.on('error', (err) => console.error('Redis 에러:', err));

// MCP 서버 생성
const server = new McpServer({
  name: "ultimate-dev-assistant-v3",
  version: "3.0.0"
});

// 모든 도구 등록
registerAllTools(server);

// Express 서버 설정
const app = express();
app.use(express.json());

// CORS 헤더 추가 (SSE를 위해)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    name: "Ultimate Dev Assistant v3",
    version: "3.0.0",
    status: "running",
    tools: {
      total: allTools.length,
      categories: {
        system: allTools.filter(t => t.name.includes('system') || t.name === 'hello_world').length,
        filesystem: allTools.filter(t => ['read_file', 'write_file', 'list_files', 'execute_command', 'search_files'].includes(t.name)).length,
        redis: allTools.filter(t => t.name.includes('redis')).length,
        notion: allTools.filter(t => t.name.includes('notion')).length,
        ref: allTools.filter(t => t.name.includes('ref')).length
      }
    },
    sessions: sessionStats,
    uptime: process.uptime()
  });
});

// 헬스체크
app.get('/health', async (req, res) => {
  const memUsage = process.memoryUsage();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024)
    },
    redis: redis.isReady ? 'connected' : 'disconnected',
    tools: allTools.length,
    sessions: sessionStats
  };

  res.json(health);
});

// 통계 엔드포인트
app.get('/stats', (req, res) => {
  const stats = {
    server: {
      name: "ultimate-dev-assistant-v3",
      version: "3.0.0",
      uptime: process.uptime(),
      platform: process.platform,
      node_version: process.version
    },
    tools: {
      total: allTools.length,
      list: allTools.map(t => ({
        name: t.name,
        description: t.description
      }))
    },
    sessions: sessionStats,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };

  res.json(stats);
});

// MCP SSE 핸들러 (수정됨)
app.post('/mcp/sse', async (req, res) => {
  try {
    // SSE 헤더 설정
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // nginx 버퍼링 비활성화
    });

    sessionStats.total++;
    sessionStats.active++;
    global.activeSessions++;

    console.error(`📡 새로운 SSE 연결 - 활성 세션: ${sessionStats.active}`);

    const transport = new StreamableHTTPServerTransport(req, res);
    await server.connect(transport);

    // res의 close 이벤트 사용 (transport.on 대신)
    res.on('close', () => {
      sessionStats.active--;
      global.activeSessions--;
      console.error(`📡 SSE 연결 종료 - 활성 세션: ${sessionStats.active}`);
    });

    // 에러 처리
    res.on('error', (error) => {
      console.error('SSE 응답 에러:', error);
      sessionStats.errors++;
    });

  } catch (error) {
    sessionStats.errors++;
    console.error('SSE 연결 오류:', error);

    // 에러 응답 처리
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// 디버그용 엔드포인트
app.get('/debug/tools', (req, res) => {
  res.json({
    tools: allTools.map(t => ({
      name: t.name,
      description: t.description,
      schema: t.inputSchema
    }))
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: ['/', '/health', '/stats', '/mcp/sse', '/debug/tools']
  });
});

// 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // 프로세스를 종료하지 않고 계속 실행
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

// 종료 처리
process.on('SIGINT', async () => {
  console.error('\n🛑 서버 종료 중...');

  // Redis 연결 종료
  if (redis.isReady) {
    await redis.quit();
    console.error('✅ Redis 연결 종료됨');
  }

  // 약간의 지연 후 종료 (진행 중인 요청 완료를 위해)
  setTimeout(() => {
    process.exit(0);
  }, 100);
});

process.on('SIGTERM', async () => {
  console.error('\n🛑 서버 종료 요청 (SIGTERM)');

  if (redis.isReady) {
    await redis.quit();
  }

  process.exit(0);
});

// 서버 시작
const isHttp = process.argv.includes('--http');

if (isHttp) {
  const PORT = process.env.PORT || 3000;
  const HOST = '0.0.0.0'; // 모든 인터페이스에서 접속 가능

  const httpServer = app.listen(PORT, HOST, () => {
    console.error(`
🚀 Ultimate Dev Assistant v3 시작됨!
📍 HTTP 모드: http://localhost:${PORT}
🌐 외부 접속: http://0.0.0.0:${PORT}
📊 통계: http://localhost:${PORT}/stats
💚 헬스체크: http://localhost:${PORT}/health
🐛 디버그: http://localhost:${PORT}/debug/tools
🛠️ 도구 개수: ${allTools.length}개
📡 SSE 엔드포인트: /mcp/sse
    `);
  });

  // 서버 에러 처리
  httpServer.on('error', (error) => {
    console.error('🚨 HTTP 서버 에러:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다!`);
      process.exit(1);
    }
  });

} else {
  // STDIO 모드
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`
🚀 Ultimate Dev Assistant v3 시작됨!
📍 STDIO 모드
🛠️ 도구 개수: ${allTools.length}개
  `);
}
