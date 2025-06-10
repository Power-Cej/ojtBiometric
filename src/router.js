const express = require("express");
const router = express.Router();
const ClockRouter = require("./ClockRouter");
const readBodyAsBuffer = require("./middlewares/readBodyAsBuffer");

router.use(readBodyAsBuffer);
new ClockRouter().mount(router);
module.exports = router;
