export default async function handler(req, res) {
  let express, cors;
  try {
    const expressMod = await import("express");
    express = expressMod.default;
    const corsMod = await import("cors");
    cors = corsMod.default;
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end(`Error on async load (api-server): ${e.message}\nStack: ${e.stack}`);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: "ok", message: "Async ES Modules works!" }));
}
