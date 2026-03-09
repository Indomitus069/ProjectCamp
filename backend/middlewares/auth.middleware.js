const { getAuth } = require("@clerk/express");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const requireAuth = asyncHandler(async (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  req.auth = { userId };
  next();
});

module.exports = { requireAuth };
