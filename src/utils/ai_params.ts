// AI 采样参数兼容层
//
// 背景：songloft-org/songloft-plugin-miot#508 —— GPT-5 / GPT-6 以及 o 系列等推理模型
// 只接受服务端默认采样参数，显式传 `temperature` / `max_tokens` 会被 400 拒绝
// （部分服务还改用 `max_completion_tokens`）。
//
// 但定制版（mi-song-gpt）的意图分类依赖低温来抑制小模型在「动作/置信度」之间乱跳，
// 直接全部省略会牺牲判定稳定性。故这里按**模型名**分流：
// 命中已知推理模型族 → 省略采样参数（最大兼容性）；其余模型 → 保留调用方给定值。
//
// 说明：这是基于命名的启发式判断，判断不出的一律按「普通模型」处理（保持原行为），
// 用户若使用特殊代理/自建模型而报 400，可在模型名中带上 reasoning 等关键字，
// 或改用服务端默认参数。

/** 已知不接受自定义采样参数的推理模型族 */
const REASONING_MODEL_RE = new RegExp(
  [
    'gpt-5(?!\\d)', // OpenAI GPT-5 系列（负向断言避免误伤 gpt-50 之类的普通命名）
    'gpt-6(?!\\d)', // OpenAI GPT-6 系列
    '(^|[/_:-])o[1-9]([^0-9a-z]|$)', // o1 / o3 / o4-mini 等，避免误伤 gpt-4o
    'deepseek[-_]?r\\d', // DeepSeek-R1 / DeepSeek-R2
    'reasoner', // deepseek-reasoner 等
    'reasoning', // 自建/代理常见的 *-reasoning 命名
    'thinking', // qwen3-thinking / glm-4.5-thinking 等
    'qvq', // 阿里 QVQ 推理模型
    '(^|[/_:-])r1([^0-9a-z]|$)', // 裸 r1 命名
  ].join('|'),
  'i',
);

/**
 * 是否为已知的推理模型（不支持自定义 temperature / max_tokens）。
 * 空模型名按普通模型处理，保持原有行为。
 */
export function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_RE.test(String(model || '').trim());
}

/**
 * 按模型能力写入采样参数：推理模型跳过，其余模型写入给定值。
 * 直接在传入的 body 上修改并原样返回，便于链式构造请求体。
 */
export function applySamplingParams(
  body: Record<string, unknown>,
  model: string,
  params: { temperature?: number; maxTokens?: number },
): Record<string, unknown> {
  if (isReasoningModel(model)) return body;
  if (typeof params.temperature === 'number') body.temperature = params.temperature;
  if (typeof params.maxTokens === 'number') body.max_tokens = params.maxTokens;
  return body;
}
