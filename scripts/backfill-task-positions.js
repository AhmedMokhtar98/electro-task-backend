"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const Task = require("../models/task/task.model.js");

const POSITION_STEP = 1000;
const BATCH_SIZE = 500;

async function flushOperations(operations) {
  if (!operations.length) return;
  await Task.bulkWrite(operations, { ordered: false, });
  operations.length = 0;
}

async function backfillTaskPositions() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required");
  }

  await mongoose.connect(process.env.MONGO_URL);

  const cursor = Task.find({})
    .sort({ client: 1, status: 1, position: 1, createdAt: 1, _id: 1, })
    .select("_id client status position")
    .lean()
    .cursor();

  const positionsByColumn = new Map();
  const operations = [];
  let updatedCount = 0;

  for await (const task of cursor) {
    const columnKey = `${task.client}:${task.status}`;
    const nextPosition = (positionsByColumn.get(columnKey) || 0) + POSITION_STEP;
    positionsByColumn.set(columnKey, nextPosition);

    if (task.position === nextPosition) continue;

    operations.push({
      updateOne: {
        filter: { _id: task._id, },
        update: { $set: { position: nextPosition, }, },
      },
    });
    updatedCount += 1;

    if (operations.length >= BATCH_SIZE) {
      await flushOperations(operations);
    }
  }

  await flushOperations(operations);
  console.log(`Task positions updated: ${updatedCount}`);
}

backfillTaskPositions()
  .catch((error) => {
    console.error("Task position migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
