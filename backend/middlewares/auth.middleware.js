const { getAuth, clerkClient } = require("@clerk/express");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

const requireAuth = asyncHandler(async (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  // Ensure user exists in our DB
  let user = await User.findOne({ clerkId: userId });
  
  if (!user) {
    try {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      user = await User.create({
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      });
    } catch (error) {
      console.error("Error syncing user with Clerk:", error);
      // Continue anyway if we can't sync, but we have the userId
    }
  }

  req.auth = { userId };
  next();
});

module.exports = { requireAuth };
