# remix-middleware

Add an express-like middleware stack to your remix loaders and actions!

```bash
yarn add remix-middleware
```

```ts
// ./app/middleware.ts
export const mdw = createMiddleware();

mdw.use(async (ctx, next) => {
  console.log("middleware activated for", ctx.request.url);
  await next();
  console.log("middleware completed for", ctx.request.url);
});

mdw.use(mdw.routes());
```

```tsx
// ./app/routes/posts/index.tsx
import { Form, useLoaderData } from "remix";

import { mdw } from "~/middleware";

interface Post {
  id: string;
  title: string;
}

export const loader = mdw.loader((ctx) => {
  // ctx.response is where the response object goes
  ctx.response = [
    {
      id: "1",
      title: "My First Post",
    },
    {
      id: "2",
      title: "A Mixtape I Made Just For You",
    },
  ];
});

export const action = mdw.action(async (ctx) => {
  const body = await ctx.request.formData();
  const post = { id: "3", title: body.get("title") };
  ctx.response = post;
});

export default function Posts() {
  const posts = useLoaderData<Post[]>();
  return (
    <div>
      <h1>Posts</h1>
      <div>
        {posts.map((post) => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>
      <div>
        <Form method="post">
          <p>
            <label>
              Title: <input name="title" type="text" />
            </label>
          </p>
          <p>
            <button type="submit">Create</button>
          </p>
        </Form>
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
      id: "1",
      title: "My First Post",
    },
    {
      id: "2",
      title: "A Mixtape I Made Just For You",
    },
  ]),
);
```
