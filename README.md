# remix-middleware

Add an express-like middleware stack to your remix loaders!

```ts
// ./app/middleware.ts
export const middleware = createMiddleware();

middleware.use(async (ctx, next) => {
  console.log("middleware activated for", ctx.request.url);
  await next();
  console.log("middleware completed for", ctx.request.url);
});

middleware.use(middleware.routes());
```

```tsx
// ./app/routes/posts/index.tsx
import { useLoaderData } from "remix";

import { middleware } from "~/middleware";

export const loader = middleware.loader((ctx) => {
  // ctx.context.response is where the response object goes
  ctx.context.response = [
    {
      slug: "my-first-post",
      title: "My First Post",
    },
    {
      slug: "90s-mixtape",
      title: "A Mixtape I Made Just For You",
    },
  ];
});

export default function Posts() {
  const posts = useLoaderData();
  return (
    <div>
      <h1>Posts</h1>
      {posts.map((post) => <div key={post.slug}>{post.title}</div>)}
    </div>
  );
}
```
