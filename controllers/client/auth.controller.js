// controllers/client/auth.controller.js

const clientAuthRepo = require("../../models/client/client.repo.js");

exports.getClient = async (req, res) => {
  const operationResultObject = await clientAuthRepo.getClient(req.user._id);
  return res.status(operationResultObject.code).json(operationResultObject);
};

exports.updateClient = async (req, res) => {
  const operationResultObject = await clientAuthRepo.updateClient(
    req.user._id,
    req.body
  );
  return res.status(operationResultObject.code).json(operationResultObject);
};

exports.register = async (req, res) => {
  const operationResultObject = await clientAuthRepo.register(req.body);
  return res.status(operationResultObject.code).json(operationResultObject);
};

exports.login = async (req, res) => {
  const formData = req.body || {}; 
  const operationResultObject = await clientAuthRepo.login(formData);
  return res.status(operationResultObject.code).json(operationResultObject);
};

exports.forgotPassword = async (req, res) => {
  const {email } = req?.body;
  const operationResultObject = await clientAuthRepo.forgotPassword(email);
  return res.status(operationResultObject.code).json(operationResultObject);
}

exports.resetPassword = async (req, res) => {
  const {token, newPassword } = req.body;
  const operationResultObject = await clientAuthRepo.resetPassword(token, newPassword);
  return res.status(operationResultObject.code).json(operationResultObject);
}

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const operationResultObject = await clientAuthRepo.refreshToken(refreshToken);
  return res.status(operationResultObject.code).json(operationResultObject);
}


exports.resendEmailConfirmationOTP = async (req, res) => {
    const { email } = req.body;
    const operationResultObject = await clientAuthRepo .resendEmailConfirmationOTP( email );

    return res .status(operationResultObject.code) .json(operationResultObject);
};

exports.confirmEmail = async (req, res) => {
  const { email, otp } = req.body;
  const operationResultObject = await clientAuthRepo.confirmEmail(email, otp);
  return res.status(operationResultObject.code).json(operationResultObject);
}
