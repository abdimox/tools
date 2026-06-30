import app from './app';
import type { Env } from './env';

export default {
  async fetch(request, env, executionContext) {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return app.fetch(request, env, executionContext);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

