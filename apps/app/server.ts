import { createServer } from "vite";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const vite = await createServer({
  server: {
    port,
    host: true,
  },
});

await vite.listen();
vite.printUrls();
