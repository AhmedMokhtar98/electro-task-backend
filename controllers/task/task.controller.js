"use strict";

const taskRepo = require("../../models/task/task.repo.js");

function sendOperationResult(res, operationResult) {
  return res.status(operationResult.code).json(operationResult);
}

exports.create = async (req, res) => {
  const operationResult = await taskRepo.create(req.user._id, req.body);
  return sendOperationResult(res, operationResult);
};

exports.list = async (req, res) => {
  const operationResult = await taskRepo.list(req.user._id, req.query);
  return sendOperationResult(res, operationResult);
};

exports.get = async (req, res) => {
  const operationResult = await taskRepo.get(req.user._id, req.params.id);
  return sendOperationResult(res, operationResult);
};

exports.update = async (req, res) => {
  const operationResult = await taskRepo.update( req.user._id, req.params.id, req.body );
  return sendOperationResult(res, operationResult);
};

exports.remove = async (req, res) => {
  const operationResult = await taskRepo.remove(
    req.user._id,
    req.params.id
  );
  return sendOperationResult(res, operationResult);
};
