module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Pure Node.js root handler works!" }));
};
