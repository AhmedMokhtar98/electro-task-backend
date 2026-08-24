const app = require("express").Router();
const taskController = require("../../controllers/task/task.controller.js");
const validator = require("../../helpers/validation.helper.js");
const errorHandler = require("../../middlewares/errorHandler/index.js");
const { createTaskValidation, listTasksValidation, taskIdValidation, updateTaskValidation, } = require("../../validations/task.validation.js");

app.post("/", validator(createTaskValidation), errorHandler(taskController.create));
app.get("/", validator(listTasksValidation), errorHandler(taskController.list));
app.get("/:id", validator(taskIdValidation), errorHandler(taskController.get));
app.put("/:id", validator(updateTaskValidation), errorHandler(taskController.update));
app.patch("/:id", validator(updateTaskValidation), errorHandler(taskController.update));
app.delete("/:id", validator(taskIdValidation), errorHandler(taskController.remove));

module.exports = app;
