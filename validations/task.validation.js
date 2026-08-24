"use strict";

const Joi = require("joi");

const TASK_STATUSES = ["To Do", "In Progress", "Done"];
const TASK_PRIORITIES = ["Low", "Medium", "High"];
const TASK_TITLE_PATTERN = /^[\p{L}\p{M}\p{N}' -]+$/u;
const TASK_DESCRIPTION_PATTERN = /^[\p{L}\p{M}\p{N}\s.,!?،؛؟'"():;\/-]+$/u;
const SORTABLE_FIELDS = [
  "position",
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
  .pattern(TASK_TITLE_PATTERN)
  .messages({
    "string.base": "errors.valid_task_title",
    "string.empty": "errors.empty_task_title",
    "string.min": "errors.empty_task_title",
    "string.max": "errors.task_title_too_long",
    "string.pattern.base": "errors.invalid_task_title_characters",
  });

const descriptionSchema = Joi.string()
  .trim()
  .min(1)
  .max(5000)
  .pattern(TASK_DESCRIPTION_PATTERN)
  .messages({
    "string.base": "errors.valid_task_description",
    "string.empty": "errors.empty_task_description",
    "string.min": "errors.empty_task_description",
    "string.max": "errors.task_description_too_long",
    "string.pattern.base": "errors.invalid_task_description_characters",
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
    dueDate: dueDateSchema,
    search: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .pattern(TASK_TITLE_PATTERN)
      .messages({
        "string.base": "errors.valid_task_search",
        "string.empty": "errors.valid_task_search",
        "string.min": "errors.valid_task_search",
        "string.max": "errors.task_search_too_long",
        "string.pattern.base": "errors.invalid_task_search_characters",
      }),
    sortBy: Joi.string()
      .valid(...SORTABLE_FIELDS)
      .default("position")
      .messages({
        "string.base": "errors.valid_task_sort_field",
        "any.only": "errors.valid_task_sort_field",
      }),
    sortOrder: Joi.string().valid("asc", "desc").default("asc").messages({
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

exports.reorderTasksValidation = {
  body: Joi.object({
    tasks: Joi.array()
      .items(
        Joi.object({
          id: idSchema,
          status: statusSchema.required(),
          position: Joi.number().integer().min(0).required().messages({
            "number.base": "errors.valid_task_position",
            "number.integer": "errors.valid_task_position",
            "number.min": "errors.valid_task_position",
            "any.required": "errors.valid_task_position",
          }),
        })
          .required()
          .unknown(false)
          .messages({
            "object.unknown": "errors.field_not_allowed",
          })
      )
      .min(1)
      .max(1000)
      .unique("id")
      .required()
      .messages({
        "array.base": "errors.invalid_task_order",
        "array.min": "errors.invalid_task_order",
        "array.max": "errors.invalid_task_order",
        "array.unique": "errors.duplicate_task_order_id",
        "any.required": "errors.required_task_order",
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
