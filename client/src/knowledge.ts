const photoboothFiles = import.meta.glob('./knowledge/photobooth/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export const photoboothKnowledge = Object.entries(photoboothFiles)
  .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
  .map(([path, content]) => `\n## ${path.split('/').pop()}\n${content}`)
  .join('\n')
  .slice(0, 48_000);

export const diyKnowledge = `
乐活互动手作DIY为企业、商场、楼盘、社区和4S店提供上门活动执行。
可用业务事实：老师上门、材料工具、桌面布置、现场教学、制作指导、成品包装。
写作时必须围绕客户的组织压力、参与门槛、现场秩序和活动匹配度，不得虚构人数、反馈、成交或活动效果。
DIY与Photobooth必须严格分开，不混写设备拍照、即拍即印等能力。
`;

export function knowledgeFor(businessType: 'diy' | 'photobooth'): string {
  return businessType === 'photobooth' ? photoboothKnowledge : diyKnowledge;
}
