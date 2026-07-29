import type Env from './env';
import handler from './handler';

export default {
  fetch: (request: Request, env: Env): Promise<Response> =>
    handler(request, env),
};
