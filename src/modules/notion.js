// 노션 연동 도구들
export const notionTools = [
  {
    name: "notion_create_page",
    description: "📋 노션 페이지 생성",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: { type: "string", description: "부모 페이지 ID" },
        title: { type: "string", description: "페이지 제목" },
        content: { type: "string", description: "페이지 내용" }
      },
      required: ["parent_id", "title"]
    }
  },
  {
    name: "notion_update_page",
    description: "📝 노션 페이지 업데이트",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "페이지 ID" },
        content: { type: "string", description: "새 내용" }
      },
      required: ["page_id", "content"]
    }
  }
];

export async function handleNotion(toolName, args) {
  switch (toolName) {
    case 'notion_create_page':
      return {
        content: [{
          type: "text",
          text: `�� 노션 페이지 생성:\n\n📄 제목: ${args.title}\n📁 부모: ${args.parent_id}\n📝 내용: ${args.content || '내용 없음'}\n\n✅ 페이지 생성 완료! (시뮬레이션)\n🔗 실제 노션 API 연결 시 실제 페이지 생성`
        }]
      };
      
    case 'notion_update_page':
      return {
        content: [{
          type: "text",
          text: `📝 노션 페이지 업데이트:\n\n🆔 페이지: ${args.page_id}\n📝 새 내용: ${args.content}\n\n✅ 업데이트 완료! (시뮬레이션)`
        }]
      };
      
    default:
      throw new Error(`Unknown Notion tool: ${toolName}`);
  }
}
