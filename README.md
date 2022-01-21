# remix-middleware

Add an express-like middleware stack to your remix loaders and actions!

```bash
yarn add remix-middleware
```

```ts
// ./app/middleware.server.ts
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
import { ActionFunction, LoaderFunction, Form, useLoaderData } from "remix";

import { mdw } from "~/middleware";

interface Post {
  id: string;
  title: string;
}

export const loader: LoaderFunction = (props) =>
  mdw.run(props, (ctx) => {
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

export const action: ActionFunction = (props) =>
  mdw.run(props, async (ctx) => {
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
export const loader: LoaderFunction = (props) =>
  mdw.run(
    props,
    mdw.response([
      {
        id: "1",
        title: "My First Post",
      },
      {
        id: "2",
        title: "A Mixtape I Made Just For You",
      },
    ])
  );
```

## remix-auth

We built a middleware that will help interacting with [remix-auth](https://github.com/sergiodxa/remix-auth)
more streamlined.

- isAuthenticated - activates `authenticator.isAuthenticated`

Setting up `remix-auth`

```tsx
// ./app/user.ts
export interface User {
  id: string;
  email: string;
}
```

```ts
// ./app/authenticator.ts
import { Authenticator } from 'remix-auth';
import { sessionStorage } from "./session";
import type { User } from './user';

export const authenticator = new Authenticator<User>(sessionStorage);
```

Create middleware for your needs

```ts
// ./app/middleware.ts
import { createMiddleware, AuthCtx, isAuthenticated } from 'remix-middleware';
import { authenticator } from './authenticator';
import type { User } from './user';

// use this middleware for routes that do *not* require authentication
// but you want the user to automatically redirect somewhere
export const unauthed = createMiddleware<AuthCtx<null>>();
unauthed.use(isAuthenticated(authenticator, { successRedirect: '/dashboard' }));
unauthed.use(unauthed.routes());

// use this middleware for routes that *require* authentication
export const authed = createMiddleware<AuthCtx<User>>();
authed.use(isAuthenticated(authenticator, { failureRedirect: '/login' }));
authed.use(authed.routes());

// use this middleware if the route allows both authenticated and
// non-authenticated users
export const mdw = createMiddleware<AuthCtx<User | null>>();
mdw.use(isAuthenticated(authenticator));
mdw.use(async (ctx, next) => {
  if (ctx.user) {
    // ... do something with the user
  } else {
    // ... do something with a non-user
  }
  await next();
});
```

Now in your routes that require authentication

```ts
// in a route that requires auth
import { authed } from '~/middleware.ts';

export const loader: LoaderFunction = (props) =>
  authed.run(props, (ctx) => {
    // no user can make it to this point without being authenticated
    // and as a result we now have access to ctx.user which is `User`
    // in this example
    console.log(ctx.user); // { id: '123', email: 'cool@lib.bro' }

    ctx.response = { text: `Hi ${ctx.user.email}!` };
  });
```

Now in your routes that do *not* require authentication

```ts
// in a route that does *not* require auth
import { authed, unauthed } from '~/middleware.ts';

// `.run()` doesn't need any middleware, it'll run without it
export const loader = (props) => unauthed.run(props);
```
