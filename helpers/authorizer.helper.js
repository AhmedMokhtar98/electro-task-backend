// helpers/authorizer.helper.js
const mongoose = require("mongoose");
const { UnauthorizedException, } = require("../middlewares/errorHandler/exceptions");

function getRequesterId(req) {
  return (
    req.params?.id ||
    req.params?._id ||
    req.query?.id ||
    req.query?._id ||
    req.body?.id ||
    req.body?._id ||
    req?.user?._id
  );
}

function ensureIdentity(req) {
  const requesterId = String(getRequesterId(req) || "");
  const userId = String(req.user?._id || "");

  if (!mongoose.Types.ObjectId.isValid(requesterId)) return false;

  return requesterId === userId;
}


exports.checkIdentity = () => (req, res, next) => {
  try {
    if (!ensureIdentity(req)) throw new UnauthorizedException("errors.unauthorized");
    return next();
  } catch (err) {
    return next(err);
  }
};
