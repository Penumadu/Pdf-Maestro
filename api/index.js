function handler(req, res) {
  try {
    const data = {
      status: "ok",
      message: "Root works!",
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    };

    if (typeof res.status === "function" && typeof res.json === "function") {
      return res.status(200).json(data);
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({
      status: "error",
      message: err.message,
      stack: err.stack
    }));
  }
}

module.exports = handler;
module.exports.default = handler;

