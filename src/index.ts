import { db } from "./db";
import { createApp } from "./main-app/controller";

export const app = createApp(db).listen({ idleTimeout: 10, port: 3000 });

console.log(
  `KMBUI backend is running at http://${app.server?.hostname}:${app.server?.port}`,
);
