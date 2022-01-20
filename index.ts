import type {
  DataFunctionArgs,
  AppData,
  LoaderFunction,
  ActionFunction,
} from '@remix-run/server-runtime';

type Next = () => any;
interface Ctx extends DataFunctionArgs {
  response: Promise<Response> | Response | Promise<AppData> | AppData;
}
type Middleware = (ctx: Ctx, next: Next) => any;
type MiddlewareCo = Middleware | Middleware[];

export function compose(middleware: Middleware[]) {
  if (!Array.isArray(middleware)) {
    throw new TypeError('Middleware stack must be an array!');
  }
  for (const fn of middleware) {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be composed of functions!');
    }
  }

  return async function composer(context: Ctx, next?: Next) {
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

const defaultMiddleware = async (_: Ctx, next: Next) => {
  await next();
};

const compileName = (request: Request): string =>
  `${request.url} [${request.method}]`;

export function createMiddleware() {
  const middleware: Middleware[] = [];
  const middlewareMap: { [key: string]: Middleware[] } = {};

  function route(md: MiddlewareCo) {
    return async function middlewareFn(props: DataFunctionArgs) {
      const name = compileName(props.request);
      if (Array.isArray(md)) {
        middlewareMap[name] = md;
      } else {
        middlewareMap[name] = [md];
      }

      const ctx: Ctx = { ...props, response: {} };
      const fn = compose(middleware);
      await fn(ctx);
      return props.context.response;
    };
  }

  return {
    use: (md: Middleware) => {
      middleware.push(md);
    },
    response: (resp: Ctx['response']) => async (ctx: Ctx, next: Next) => {
      ctx.response = resp;
      await next();
    },
    routes: () => async (ctx: Ctx, next: Next) => {
      const name = compileName(ctx.request);
      const match = middlewareMap[name];
      if (!match) {
        await next();
        return;
      }

      const md = compose(match);
      await md(ctx, next);
    },
    loader: (md: MiddlewareCo = defaultMiddleware): LoaderFunction => route(md),
    action: (md: MiddlewareCo = defaultMiddleware): ActionFunction => route(md),
  };
}
