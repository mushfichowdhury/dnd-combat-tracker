This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project is preconfigured for Vercel using the [`vercel.json`](./vercel.json) file in the repository root. To deploy:

1. Install the [Vercel CLI](https://vercel.com/docs/cli) and authenticate:

   ```bash
   npm install -g vercel
   vercel login
   ```

2. From the project root, run an initial deployment. This creates the Vercel project and links it to your repository:

   ```bash
   vercel --prod
   ```

   When prompted, select the appropriate scope, project name, and confirm that the project should be linked. The provided defaults work for most setups because the CLI automatically reads the `vercel.json` configuration.

3. For subsequent deployments, either push to the connected Git branch or run `vercel --prod` again. Vercel will install dependencies using `npm install`, build the app with `npm run build`, and host the production bundle.

Consult the [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for additional customization options.
