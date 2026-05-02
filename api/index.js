module.exports = function handler(req, res) {
  let express, cors;
  try {
    express = require("express");
    cors = require("cors");
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Error on require (Root): ${e.message}\nStack: ${e.stack}`);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Async CommonJS works!" }));
};
