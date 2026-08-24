"use strict";

const Joi = require("joi");

const TASK_STATUSES = ["To Do", "In Progress", "Done"];
const TASK_PRIORITIES = ["Low", "Medium", "High"];
const SORTABLE_FIELDS = [
  "title",
  "status",
  "priority",
  "dueDate",
  "createdAt",
  "updatedAt",
];

const idSchema = Joi.string()
  .trim()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .required()
  .messages({
    "string.base": "errors.invalid_id",
    "string.empty": "errors.invalid_id",
    "string.pattern.base": "errors.invalid_id",
    "any.required": "errors.invalid_id",
  });

const titleSchema = Joi.string()
  .trim()
  .min(1)
  .max(200)
  .messages({
    "string.base": "errors.valid_task_title",
    "string.empty": "errors.empty_task_title",
    "string.min": "errors.empty_task_title",
    "string.max": "errors.task_title_too_long",
  });

const descriptionSchema = Joi.string()
  .trim()
  .min(1)
  .max(5000)
  .messages({
    "string.base": "errors.valid_task_description",
    "string.empty": "errors.empty_task_description",
    "string.min": "errors.empty_task_description",
    "string.max": "errors.task_description_too_long",
  });

const statusSchema = Joi.string()
  .valid(...TASK_STATUSES)
  .messages({
    "string.base": "errors.valid_task_status",
    "any.only": "errors.valid_task_status",
  });

const prioritySchema = Joi.string()
  .valid(...TASK_PRIORITIES)
  .messages({
    "string.base": "errors.valid_task_priority",
    "any.only": "errors.valid_task_priority",
  });

const dueDateSchema = Joi.date().iso().messages({
  "date.base": "errors.valid_task_due_date",
  "date.format": "errors.valid_task_due_date",
});

const paramsSchema = Joi.object({
  id: idSchema,
})
  .required()
  .unknown(false)
  .messages({
    "object.unknown": "errors.field_not_allowed",
  });

const taskBodyFields = {
  title: titleSchema,
  description: descriptionSchema,
  status: statusSchema,
  priority: prioritySchema,
  dueDate: dueDateSchema,
};

exports.createTaskValidation = {
  body: Joi.object({
    ...taskBodyFields,
    title: titleSchema.required().messages({
      "any.required": "errors.required_task_title",
    }),
    description: descriptionSchema.required().messages({
      "any.required": "errors.required_task_description",
    }),
    dueDate: dueDateSchema.required().messages({
      "any.required": "errors.required_task_due_date",
    }),
  })
    .required()
    .unknown(false)
    .messages({
      "object.base": "errors.valid_request_body",
      "object.unknown": "errors.field_not_allowed",
      "any.required": "errors.required_request_body",
    }),
};

exports.listTasksValidation = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.base": "errors.valid_page",
      "number.integer": "errors.valid_page",
      "number.min": "errors.valid_page",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "errors.valid_limit",
      "number.integer": "errors.valid_limit",
      "number.min": "errors.valid_limit",
      "number.max": "errors.valid_limit",
    }),
    status: statusSchema,
    priority: prioritySchema,
    search: Joi.string().trim().min(1).max(100).messages({
      "string.base": "errors.valid_task_search",
      "string.empty": "errors.valid_task_search",
      "string.min": "errors.valid_task_search",
      "string.max": "errors.task_search_too_long",
    }),
    sortBy: Joi.string()
      .valid(...SORTABLE_FIELDS)
      .default("createdAt")
      .messages({
        "string.base": "errors.valid_task_sort_field",
        "any.only": "errors.valid_task_sort_field",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "string.base": "errors.valid_sort_order",
      "any.only": "errors.valid_sort_order",
    }),
  })
    .unknown(false)
    .messages({
      "object.unknown": "errors.field_not_allowed",
    }),
};

exports.taskIdValidation = {
  params: paramsSchema,
};

exports.updateTaskValidation = {
  params: paramsSchema,
  body: Joi.object(taskBodyFields)
    .min(1)
    .required()
    .unknown(false)
    .messages({
      "object.base": "errors.valid_request_body",
      "object.min": "errors.empty_task_update",
      "object.unknown": "errors.field_not_allowed",
      "any.required": "errors.required_request_body",
    }),
};
