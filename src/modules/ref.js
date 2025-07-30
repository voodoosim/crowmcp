// Ref 검색 관련 도구들
export const refTools = [
  {
    name: "ref_search_docs",
    description: "📚 Ref 기술 문서 검색",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "검색 쿼리" },
        source: { type: "string", enum: ["public", "private"], default: "public" }
      },
      required: ["query"]
    }
  },
  {
    name: "ref_solve_error",
    description: "🐛 Ref 에러 해결책 검색",
    inputSchema: {
      type: "object",
      properties: {
        error: { type: "string", description: "에러 메시지" },
        language: { type: "string", description: "프로그래밍 언어" }
      },
      required: ["error"]
    }
  }
];

export async function handleRef(toolName, args) {
  switch (toolName) {
    case 'ref_search_docs':
      return {
        content: [{
          type: "text",
          text: `📚 Ref 문서 검색 결과:\n\n🔍 쿼리: ${args.query}\n📖 소스: ${args.source}\n\n📋 검색 결과:\n1. 공식 문서 - ${args.query} 가이드\n2. GitHub 예제 - 실제 구현 사례\n3. StackOverflow - 관련 질문들\n\n💡 실제 Ref API 연결 시 정확한 문서 내용 제공`
        }]
      };
      
    case 'ref_solve_error':
      return {
        content: [{
          type: "text",
          text: `🐛 에러 해결책 검색:\n\n❌ 에러: ${args.error}\n🔤 언어: ${args.language || '자동감지'}\n\n💡 해결책:\n1. 일반적인 원인과 해결방법\n2. 관련 문서 링크\n3. 코드 예제\n\n🔗 참고 자료: 최신 문서 및 커뮤니티 답변`
        }]
      };
      
    default:
      throw new Error(`Unknown Ref tool: ${toolName}`);
  }
}
