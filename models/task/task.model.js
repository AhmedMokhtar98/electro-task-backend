const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "clients", required: true, index: true, },

    title: { type: String, required: true, trim: true, },

    description: { type: String, required: true, trim: true, },

    status: { type: String, enum: ["To Do", "In Progress", "Done"], default: "To Do", required: true, },

    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium", required: true, },

    dueDate: { type: Date, required: true, },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Supports filtering and sorting tasks belonging to the authenticated client.
taskSchema.index({
  client: 1,
  status: 1,
  priority: 1,
  dueDate: 1,
});

// Supports case-insensitive task-title search per client.
taskSchema.index({
  client: 1,
  title: 1,
});

// Prevent OverwriteModelError.
const Task =
  mongoose.models.tasks || mongoose.model("tasks", taskSchema);

module.exports = Task;