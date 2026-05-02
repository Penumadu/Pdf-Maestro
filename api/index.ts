import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import pino from "pino";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const app: Express = express();

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

app.use("/api", router);

export default app;
