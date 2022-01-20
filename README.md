# remix-middleware

Add an express-like middleware stack to your remix loaders and actions!

```ts
// ./app/middleware.ts
export const mdw = createMiddleware();

mdw.use(async (ctx, next) => {
  console.log("middleware activated for", ctx.request.url);
  await next();
  console.log("middleware completed for", ctx.request.url);
});

mdw.use(middleware.routes());
```

```tsx
// ./app/routes/posts/index.tsx
import { useLoaderData } from "remix";

import { mdw } from "~/middleware";

export const loader = mdw.loader((ctx) => {
  // ctx.response is where the response object goes
  ctx.response = [
    {
      title: "My First Post",
    },
    {
      title: "A Mixtape I Made Just For You",
    },
  ];
});

export const action = mdw.action(async ({ request }) => {
  const body = await request.formData();
  const post = await createPost(body);
  ctx.response = redirect(`/posts/${post.id}`);
});

export default function Posts() {
  const posts = useLoaderData();
  return (
    <div>
      <h1>Posts</h1>
      <div>
        {posts.map((post) => <div key={post.slug}>{post.title}</div>)}
      </div>
      <div>
        <form method="post" action="/posts">
          <p>
            <label>
              Title: <input name="title" type="text" />
            </label>
          </p>
          <p>
            <button type="submit">Create</button>
          </p>
        </form>
      </div>
    </div>
  );
}
```

Just have simple JSON that you are returning in a loader like in the example
above?

```tsx
export const loader = mdw.loader(
  mdw.response([
    {
      title: 'My First Post',
    },
    {
      title: 'A Mixtape I Made Just For You',
    },
  ]),
);
```
