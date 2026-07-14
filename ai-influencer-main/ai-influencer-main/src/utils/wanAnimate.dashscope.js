// ─────────────────────────────────────────────────────────────────────────────
// Wan Animate — DashScope direct backend (stub)
// ─────────────────────────────────────────────────────────────────────────────
// Future implementation. When ready:
//   1. Add a /api/wan-animate/* Vercel proxy that holds DASHSCOPE_API_KEY
//      (mirror api/hf/[...path].js pattern).
//   2. Add the corresponding vite.config.js dev plugin.
//   3. Implement submitJob / pollJob against DashScope async API:
//        POST  https://dashscope.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis/
//        GET   https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}
//   4. Uncomment the import in wanAnimate.js.
//   5. Set VITE_WAN_ANIMATE_BACKEND=dashscope in .env.local / Vercel.
//
// The submitJob / pollJob signatures MUST match the Gradio backend below so
// the swap is invisible to consumers.
// ─────────────────────────────────────────────────────────────────────────────

export async function submitJob() {
  throw new Error('DashScope direct backend not implemented yet — see wanAnimate.dashscope.js header')
}

export async function pollJob() {
  throw new Error('DashScope direct backend not implemented yet — see wanAnimate.dashscope.js header')
}

export function cancelJob() {
  throw new Error('DashScope direct backend not implemented yet — see wanAnimate.dashscope.js header')
}