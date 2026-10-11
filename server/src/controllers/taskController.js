import { z } from 'zod';
import Task from '../models/Task.js';
import { HttpError } from '../utils/httpError.js';

const statuses = ['todo', 'in_progress', 'done'];
const taskIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Task ID is invalid');

const listQuerySchema = z.object({
  status: z.enum(statuses).optional(),
  q: z.string().trim().max(100).optional(),
}).strict();

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(statuses).optional(),
}).strict();

const updateTaskSchema = createTaskSchema.partial().refine(
  (fields) => Object.keys(fields).length > 0,
  'At least one task field must be provided',
);

function parseTaskId(id) {
  return taskIdSchema.parse(id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function notFound() {
  return new HttpError(404, 'TASK_NOT_FOUND', 'Task was not found');
}

export async function listTasks(req, res) {
  const { status, q } = listQuerySchema.parse(req.query);
  const filter = { owner: req.userId };

  if (status) filter.status = status;
  if (q) {
    const search = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: search }, { description: search }];
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  return res.status(200).json({ data: { tasks } });
}

export async function createTask(req, res) {
  const fields = createTaskSchema.parse(req.body);
  const task = await Task.create({ ...fields, owner: req.userId });
  return res.status(201).json({ data: { task } });
}

export async function getTask(req, res) {
  const id = parseTaskId(req.params.id);
  const task = await Task.findOne({ _id: id, owner: req.userId });
  if (!task) throw notFound();

  return res.status(200).json({ data: { task } });
}

export async function updateTask(req, res) {
  const id = parseTaskId(req.params.id);
  const fields = updateTaskSchema.parse(req.body);
  const task = await Task.findOneAndUpdate(
    { _id: id, owner: req.userId },
    { $set: fields },
    { returnDocument: 'after', runValidators: true },
  );
  if (!task) throw notFound();

  return res.status(200).json({ data: { task } });
}

export async function deleteTask(req, res) {
  const id = parseTaskId(req.params.id);
  const task = await Task.findOneAndDelete({ _id: id, owner: req.userId });
  if (!task) throw notFound();

  return res.status(200).json({ data: { deleted: true } });
}
