import express, { type Express } from "express";
import cors from "cors";
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const app: Express = express();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

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
