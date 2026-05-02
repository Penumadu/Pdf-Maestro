let errorOnLoad = null;
try {
  const express = require("express");
  const cors = require("cors");
} catch (e) {
  errorOnLoad = e;
}

module.exports = function handler(req, res) {
  if (errorOnLoad) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Error on load (Root): ${errorOnLoad.message}\nStack: ${errorOnLoad.stack}`);
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Error-catch root works!" }));
};
