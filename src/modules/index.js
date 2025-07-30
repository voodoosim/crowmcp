// 모든 도구들을 통합 관리
import { z } from 'zod';
import { filesystemTools, handleFilesystem } from './filesystem.js';
import { systemTools, handleSystem } from './system.js';
import { redisTools, handleRedis } from './redis.js';
import { notionTools, handleNotion } from './notion.js';
import { refTools, handleRef } from './ref.js';

// JSON Schema를 Zod 스키마로 변환하는 함수
function convertToZodSchema(jsonSchema) {
  if (!jsonSchema || !jsonSchema.properties) {
    return z.object({});
  }
  const zodShape = {};
  
  for (const [key, prop] of Object.entries(jsonSchema.properties)) {
    let zodType;
    
    switch (prop.type) {
      case 'string':
        zodType = z.string();
        if (prop.description) zodType = zodType.describe(prop.description);
        if (prop.default !== undefined) zodType = zodType.default(prop.default);
        if (prop.enum) zodType = z.enum(prop.enum);
        break;
      case 'number':
        zodType = z.number();
        if (prop.description) zodType = zodType.describe(prop.description);
        if (prop.default !== undefined) zodType = zodType.default(prop.default);
        break;
      case 'boolean':
        zodType = z.boolean();
        if (prop.description) zodType = zodType.describe(prop.description);
        if (prop.default !== undefined) zodType = zodType.default(prop.default);
        break;
      default:
        zodType = z.any();
    }
    
    // required 체크
    if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
      zodType = zodType.optional();
    }
    
    zodShape[key] = zodType;
  }
  
  return z.object(zodShape);
}

// 모든 도구 통합
export const allTools = [
  ...systemTools,
  ...filesystemTools,
  ...redisTools,
  ...notionTools,
  ...refTools
];

// 도구 핸들러 매핑
const handlers = {
  hello_world: handleSystem,
  system_status: handleSystem,
  read_file: handleFilesystem,
  write_file: handleFilesystem,
  list_files: handleFilesystem,
  execute_command: handleFilesystem,
  search_files: handleFilesystem,
  redis_cache_set: handleRedis,
  redis_cache_get: handleRedis,
  notion_create_page: handleNotion,
  notion_update_page: handleNotion,
  ref_search_docs: handleRef,
  ref_solve_error: handleRef
};

// 도구 실행 함수
export async function executeTool(toolName, args) {
  const handler = handlers[toolName];
  if (!handler) {
    return {
      success: false,
      error: `도구를 찾을 수 없습니다: ${toolName}`
    };
  }
  
  try {
    return await handler(toolName, args);
  } catch (error) {
    return {
      success: false,
      error: `도구 실행 중 오류: ${error.message}`
    };
  }
}

// MCP 서버에 도구 등록하는 헬퍼 함수
export function registerAllTools(server) {
  allTools.forEach(tool => {
    // JSON Schema를 Zod 스키마로 변환
    const zodSchema = convertToZodSchema(tool.inputSchema);
    
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: zodSchema  // Zod 스키마 사용
      },
      async (args) => {
        return await executeTool(tool.name, args);
      }
    );
  });
  
  console.error(`✅ ${allTools.length}개의 도구가 등록되었습니다:`);  // ✅ 수정됨
  allTools.forEach(tool => {
    console.error(`  - ${tool.description} (${tool.name})`);  // ✅ 수정됨
  });
}
