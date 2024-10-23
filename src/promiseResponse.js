function promiseResponse(handler) {
  return function (req, res, next) {
    handler(req, res)
      .then((data) => {
        res.status(200); // Default status code

        if (Buffer.isBuffer(data)) {
          res.end(data);
          return;
        }
        if (typeof data === "object") {
          res.json(data);
          return;
        }

        // For string, number or other types of data
        res.setHeader("Content-Type", "text/plain");
        res.send(data);
      })
      .catch((error) => {
        console.error("Error during request processing:", error);
        res.status(500).json({ error: "Internal Server Error" });
      });
  };
}

module.exports = promiseResponse;
