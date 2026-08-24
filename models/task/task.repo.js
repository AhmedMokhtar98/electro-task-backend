"use strict";
const Task = require("./task.model.js");
const { NotFoundException, } = require("../../middlewares/errorHandler/exceptions");
const prepareQueryObjects = require("../../helpers/prepareQueryObjects.js");
const SORTABLE_FIELDS = [ "position", "title", "status", "priority", "dueDate", "createdAt", "updatedAt", ];
const POSITION_STEP = 1000;

function taskNotFound() {
  return new NotFoundException("errors.task_not_found");
}

exports.create = async (clientId, formObject = {}) => {
  const status = formObject.status || "To Do";
  const lastTask = await Task.findOne({ client: clientId, status, })
    .sort({ position: -1, })
    .select("position")
    .lean();
  const position = (lastTask?.position || 0) + POSITION_STEP;
  const task = await Task.create({ ...formObject, client: clientId, status, position, });
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
      defaultSort: "position",
      allowedSortFields: SORTABLE_FIELDS,
      searchFields: ["title"],
      tieBreaker: "_id",
    }
  );
  const skip = (pageNumber - 1) * limitNumber;

  if (taskFilter.dueDate) {
    const startOfDay = new Date(taskFilter.dueDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    taskFilter.dueDate = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  }

  const [tasks, count] = await Promise.all([ Task.find(taskFilter) .sort(sortObject) .skip(skip) .limit(limitNumber) .lean(), Task.countDocuments(taskFilter), ]);

  return {
    success: true,
    code: 200,
    result: tasks,
    page: pageNumber,
    limit: limitNumber,
    count,
    totalPages: Math.ceil(count / limitNumber),
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
  const currentTask = await Task.findOne({ _id: taskId, client: clientId, }).lean();

  if (!currentTask) {
    throw taskNotFound();
  }

  if (formObject.status && formObject.status !== currentTask.status) {
    const lastTask = await Task.findOne({ client: clientId, status: formObject.status, })
      .sort({ position: -1, })
      .select("position")
      .lean();
    formObject.position = (lastTask?.position || 0) + POSITION_STEP;
  }

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

exports.reorder = async (clientId, taskUpdates = []) => {
  const taskIds = taskUpdates.map(({ id }) => id);
  const ownedTaskCount = await Task.countDocuments({
    _id: { $in: taskIds, },
    client: clientId,
  });

  if (ownedTaskCount !== taskIds.length) {
    throw taskNotFound();
  }

  await Task.bulkWrite(
    taskUpdates.map(({ id, status, position, }) => ({
      updateOne: {
        filter: { _id: id, client: clientId, },
        update: { $set: { status, position, }, },
      },
    })),
    { ordered: true, }
  );

  const tasks = await Task.find({
    _id: { $in: taskIds, },
    client: clientId,
  })
    .sort({ position: 1, _id: 1, })
    .lean();

  return {
    success: true,
    code: 200,
    result: { tasks, },
    message: "success.tasks_reordered",
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
