const riskyExpressions = [
  '私信我', '私信咨询', '私信领取', '私信', '加微信', '加V', 'VX', 'V我', '扫码', '二维码',
  '联系我', '留言报价', '获取报价', '报价', '私聊', '进群', '主页加我', '主页联系方式',
  '发我人数', '发我日期', '要方案找我', '想做可以问我', '想了解可以私信',
];

export function riskyWords(fields: Record<string, string | string[]>): string[] {
  const found: string[] = [];
  for (const value of Object.values(fields)) {
    const content = Array.isArray(value) ? value.join('\n') : value;
    for (const word of riskyExpressions) if (content.toLowerCase().includes(word.toLowerCase())) found.push(word);
  }
  return [...new Set(found)];
}
