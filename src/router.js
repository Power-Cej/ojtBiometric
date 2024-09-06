const express = require('express');
const router = express.Router();
const ClockRouter = require("./ClockRouter");

router.use(express.text());
new ClockRouter().mount(router);
module.exports = router;
