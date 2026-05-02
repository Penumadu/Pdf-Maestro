let errorOnLoad = null;
let express, cors;
try {
  express = (await import("express")).default;
  cors = (await import("cors")).default;
} catch (e) {
  errorOnLoad = e;
}

export default function handler(req, res) {
  if (errorOnLoad) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Error on load (api-server): ${errorOnLoad.message}\nStack: ${errorOnLoad.stack}`);
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Error-catch api-server works!" }));
}
