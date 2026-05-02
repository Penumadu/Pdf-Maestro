function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Dual-export api-server works!" }));
}

module.exports = handler;
module.exports.default = handler;
