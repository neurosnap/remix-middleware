import type { DataFunctionArgs, AppData } from '@remix-run/server-runtime';
import type { Authenticator } from 'remix-auth';

type Next = () => any;
export interface Ctx extends DataFunctionArgs {
  response: Promise<Response> | Response | Promise<AppData> | AppData;
}
export interface AuthCtx<U = any> extends Ctx {
  user: U;
}

type Middleware<CurCtx extends Ctx = Ctx> = (ctx: CurCtx, next: Next) => any;
type MiddlewareCo<CurCtx extends Ctx = Ctx> =
  | Middleware<CurCtx>
  | Middleware<CurCtx>[];

export function compose<CurCtx extends Ctx = Ctx>(
  middleware: Middleware<CurCtx>[],
) {
  if (!Array.isArray(middleware)) {
    throw new TypeError('Middleware stack must be an array!');
  }
  for (const fn of middleware) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be composed of functions!');
    }
  }

  return async function composer(context: CurCtx, next?: Next) {
    // last called middleware #
    let index = -1;
    await dispatch(0);

    async function dispatch(i: number) {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;
      let fn: any = middleware[i];
      if (i === middleware.length) fn = next;
      if (!fn) return;
      await fn(context, dispatch.bind(null, i + 1));
    }
  };
}

async function defaultMiddleware<CurCtx extends Ctx = Ctx>(
  _: CurCtx,
  next: Next,
) {
  await next();
}

const compileName = (request: Request): string =>
  `${request.url} [${request.method}]`;

export function createMiddleware<CurCtx extends Ctx = Ctx>() {
  const middleware: Middleware<CurCtx>[] = [];
  const middlewareMap: { [key: string]: Middleware<CurCtx>[] } = {};

  async function middlewareFn(
    props: DataFunctionArgs,
    md: MiddlewareCo<CurCtx>,
  ) {
    const name = compileName(props.request);
    if (Array.isArray(md)) {
      middlewareMap[name] = md;
    } else {
      middlewareMap[name] = [md];
    }

    const ctx: Ctx = { ...props, response: {} };
    const fn = compose(middleware);
    await fn(ctx as any);
    return ctx.response;
  }

  return {
    use: (md: Middleware<CurCtx>) => {
      middleware.push(md);
    },
    response: (resp: CurCtx['response']) => async (ctx: CurCtx, next: Next) => {
      ctx.response = resp;
      await next();
    },
    routes: () => async (ctx: CurCtx, next: Next) => {
      const name = compileName(ctx.request);
      const match = middlewareMap[name];
      if (!match) {
        await next();
        return;
      }

      const md = compose(match);
      await md(ctx, next);
    },
    run: (
      props: DataFunctionArgs,
      md: MiddlewareCo<CurCtx> = defaultMiddleware,
    ): Promise<Response> | Promise<AppData> => middlewareFn(props, md),
  };
}

export function isAuthenticated<U>(
  auth: Authenticator<U>,
  options?: { successRedirect?: never; failureRedirect?: never },
): Middleware<AuthCtx<U | null>>;
export function isAuthenticated<U>(
  auth: Authenticator<U>,
  options: { successRedirect: string; failureRedirect?: never },
): Middleware<AuthCtx<null>>;
export function isAuthenticated<U>(
  auth: Authenticator<U>,
  options: { successRedirect?: never; failureRedirect: string },
): Middleware<AuthCtx<U>>;
export function isAuthenticated<U = any>(
  auth: Authenticator<U>,
  props:
    | { successRedirect?: never; failureRedirect?: never }
    | { successRedirect: string; failureRedirect?: never }
    | { successRedirect?: never; failureRedirect: string } = {},
): Middleware<AuthCtx<U | null>> {
  async function isAuthMdw(ctx: AuthCtx, next: Next) {
    const user = await auth.isAuthenticated(ctx.request, props as any);
    ctx.user = user;
    await next();
  }
  return isAuthMdw;
}
