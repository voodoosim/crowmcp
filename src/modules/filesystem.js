// 파일 시스템 관련 도구들
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const filesystemTools = [
  {
    name: "read_file",
    description: "📄 파일 내용 읽기",
    inputSchema: {
      type: "object",
      properties: {
        filepath: { type: "string", description: "읽을 파일 경로" },
        encoding: { type: "string", default: "utf-8", description: "파일 인코딩" }
      },
      required: ["filepath"]
    }
  },
  {
    name: "write_file",
    description: "✏️ 파일에 내용 쓰기",
    inputSchema: {
      type: "object",
      properties: {
        filepath: { type: "string", description: "파일 경로" },
        content: { type: "string", description: "쓸 내용" },
        backup: { type: "boolean", default: true, description: "백업 생성 여부" }
      },
      required: ["filepath", "content"]
    }
  },
  {
    name: "list_files",
    description: "📁 디렉토리의 파일 목록 조회",
    inputSchema: {
      type: "object",
      properties: {
        directory: { type: "string", default: ".", description: "디렉토리 경로" },
        recursive: { type: "boolean", default: false, description: "재귀 탐색" }
      }
    }
  },
  {
    name: "execute_command",
    description: "⚡ 시스템 명령어 실행",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "실행할 명령어" },
        cwd: { type: "string", description: "작업 디렉토리" }
      },
      required: ["command"]
    }
  },
  {
    name: "search_files",
    description: "🔍 파일 내용 검색",
    inputSchema: {
      type: "object",
      properties: {
        directory: { type: "string", default: ".", description: "검색 디렉토리" },
        pattern: { type: "string", description: "검색할 패턴" },
        extension: { type: "string", description: "파일 확장자 필터" }
      },
      required: ["pattern"]
    }
  }
];

export async function handleFilesystem(toolName, args) {
  switch (toolName) {
    case "read_file":
      try {
        const absolutePath = path.resolve(args.filepath);
        const stats = await fs.stat(absolutePath);

        // 파일 크기 체크 (10MB 제한)
        if (stats.size > 10 * 1024 * 1024) {
          return {
            success: false,
            error: "파일이 너무 큽니다 (10MB 초과)"
          };
        }

        const content = await fs.readFile(absolutePath, args.encoding || 'utf-8');
        return {
          success: true,
          content,
          stats: {
            size: stats.size,
            modified: stats.mtime,
            path: absolutePath
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }

    case "write_file":
      try {
        const absolutePath = path.resolve(args.filepath);

        // 백업 생성
        if (args.backup !== false) {
          try {
            await fs.access(absolutePath);
            const backupPath = `${absolutePath}.backup.${Date.now()}`;
            await fs.copyFile(absolutePath, backupPath);
          } catch {
            // 파일이 없으면 백업 건너뜀
          }
        }

        // 디렉토리 생성
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // 파일 쓰기
        await fs.writeFile(absolutePath, args.content, 'utf-8');

        return {
          success: true,
          path: absolutePath,
          size: Buffer.byteLength(args.content, 'utf-8')
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }

    case "list_files":
      try {
        const absolutePath = path.resolve(args.directory || '.');

        if (args.recursive) {
          const files = [];
          async function walk(dir) {
            const items = await fs.readdir(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = path.join(dir, item.name);
              if (item.isDirectory()) {
                await walk(fullPath);
              } else {
                files.push(path.relative(absolutePath, fullPath));
              }
            }
          }
          await walk(absolutePath);
          return { success: true, files, count: files.length };
        } else {
          const items = await fs.readdir(absolutePath, { withFileTypes: true });
          const files = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file'
          }));
          return { success: true, files, count: files.length };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }

    case "execute_command":
      try {
        const startTime = Date.now();
        const options = {
          cwd: args.cwd || process.cwd(),
          timeout: 30000, // 30초 타임아웃
          maxBuffer: 1024 * 1024 * 10 // 10MB
        };

        const { stdout, stderr } = await execAsync(args.command, options);

        return {
          success: true,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stdout: error.stdout?.trim(),
          stderr: error.stderr?.trim(),
          code: error.code
        };
      }

    case "search_files":
      try {
        const absolutePath = path.resolve(args.directory || '.');
        const results = [];

        async function searchInDir(dir) {
          const items = await fs.readdir(dir, { withFileTypes: true });

          for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory() && !item.name.startsWith('.')) {
              await searchInDir(fullPath);
            } else if (item.isFile()) {
              // 확장자 필터
              if (args.extension && !item.name.endsWith(args.extension)) {
                continue;
              }

              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                if (content.includes(args.pattern)) {
                  // 매칭된 라인 찾기
                  const lines = content.split('\n');
                  const matches = [];

                  lines.forEach((line, index) => {
                    if (line.includes(args.pattern)) {
                      matches.push({
                        line: index + 1,
                        content: line.trim()
                      });
                    }
                  });

                  results.push({
                    file: path.relative(absolutePath, fullPath),
                    matches: matches.slice(0, 5) // 최대 5개 매치만
                  });
                }
              } catch {
                // 바이너리 파일 등은 건너뜀
              }
            }
          }
        }

        await searchInDir(absolutePath);

        return {
          success: true,
          results,
          totalFiles: results.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }

    default:
      return {
        success: false,
        error: `알 수 없는 도구: ${toolName}`
      };
  }
}
