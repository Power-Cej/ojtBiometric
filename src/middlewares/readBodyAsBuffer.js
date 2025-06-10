function readBodyAsBuffer(req, res, next) {
  const chunks = [];
  req.on("data", (chunk) => {
    chunks.push(chunk);
  });
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    req.body = body.toString("binary");
    next();
  });
  req.on("error", (err) => {
    next(err);
  });
}

module.exports = readBodyAsBuffer;
