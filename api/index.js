const express = require("express");
const cors = require("cors");

const app = express();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const router = express.Router();

router.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

module.exports = app;
