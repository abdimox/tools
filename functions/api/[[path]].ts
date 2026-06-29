import app from '../../worker/src/app';
import type { Env } from '../../worker/src/env';

export const onRequest: PagesFunction<Env> = (context) => app.fetch(
  context.request,
  context.env,
  {
    waitUntil: (promise) => context.waitUntil(promise),
    passThroughOnException: () => context.passThroughOnException(),
    props: {},
  },
);
