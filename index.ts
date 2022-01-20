import type {
  DataFunctionArgs,
  AppData,
  LoaderFunction,
  ActionFunction,
} from '@remix-run/server-runtime';

type Next = () => any;
interface Ctx extends DataFunctionArgs {
  context: {
    response: Promise<Response> | Response | Promise<AppData> | AppData;
    [key: string]: any;
  };
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

export function createMiddleware() {
  const middleware: Middleware[] = [];
  const middlewareMap: { [key: string]: Middleware[] } = {};

  function route(md: MiddlewareCo) {
    return async function middlewareFn(props: DataFunctionArgs) {
      if (Array.isArray(md)) {
        middlewareMap[props.request.url] = md;
      } else {
        middlewareMap[props.request.url] = [md];
      }

      props.context = {
        response: {},
      };
      const fn = compose(middleware);
      await fn(props);
      return props.context.response;
    };
  }

  return {
    use: (md: Middleware) => {
      middleware.push(md);
    },
    routes: () => async (ctx: Ctx, next: Next) => {
      const match = middlewareMap[ctx.request.url];
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
