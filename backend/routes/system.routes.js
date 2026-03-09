const express = require("express");
const router = express.Router();
const ApiResponse = require("../utils/apiResponse");

router.get("/", (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: "OK" }, "Server is healthy"));
});

module.exports = router;
