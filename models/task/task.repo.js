"use strict";
const Task = require("./task.model.js");
const { NotFoundException, } = require("../../middlewares/errorHandler/exceptions");
const prepareQueryObjects = require("../../helpers/prepareQueryObjects.js");
const SORTABLE_FIELDS = [ "title", "status", "priority", "dueDate", "createdAt", "updatedAt", ];

function taskNotFound() {
  return new NotFoundException("errors.task_not_found");
}

exports.create = async (clientId, formObject = {}) => {
  const task = await Task.create({ ...formObject, client: clientId, });
  return {
    success: true,
    code: 201,
    result: { task },
    message: "success.task_created",
  };
};

exports.list = async (clientId, filterObject = {}) => {
  const { filterObject: taskFilter, sortObject, pageNumber, limitNumber, } = prepareQueryObjects(
    { ...filterObject, client: clientId },
    {},
    {
      defaultSort: "-createdAt",
      allowedSortFields: SORTABLE_FIELDS,
      searchFields: ["title"],
      tieBreaker: "_id",
    }
  );
  const skip = (pageNumber - 1) * limitNumber;

  const [tasks, total] = await Promise.all([ Task.find(taskFilter) .sort(sortObject) .skip(skip) .limit(limitNumber) .lean(), Task.countDocuments(taskFilter), ]);

  return {
    success: true,
    code: 200,
    result: {
      tasks,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    },
    message: "success.tasks_retrieved",
  };
};

exports.get = async (clientId, taskId) => {
  const task = await Task.findOne({ _id: taskId, client: clientId, }).lean();

  if (!task) { throw taskNotFound(); }

  return {
    success: true,
    code: 200,
    result: { task },
    message: "success.task_retrieved",
  };
};

exports.update = async (clientId, taskId, formObject = {}) => {
  const task = await Task.findOneAndUpdate( { _id: taskId, client: clientId, }, { $set: formObject, }, { new: true, runValidators: true, } ).lean();

  if (!task) {
    throw taskNotFound();
  }

  return {
    success: true,
    code: 200,
    result: { task },
    message: "success.task_updated",
  };
};

exports.remove = async (clientId, taskId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, client: clientId, }).lean();

  if (!task) {
    throw taskNotFound();
  }

  return {
    success: true,
    code: 200,
    result: { task },
    message: "success.task_deleted",
  };
};
