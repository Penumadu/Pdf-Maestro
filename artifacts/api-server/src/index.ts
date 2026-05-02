import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
const isVercel = process.env["VERCEL"] === "1" || !!process.env["VERCEL"];

if (!isVercel) {
  const port = rawPort ? Number(rawPort) : 3001;
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

export default app;
