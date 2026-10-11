import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../controllers/taskController.js';

const router = Router();

router.use(authenticate);
router.route('/')
  .get(listTasks)
  .post(createTask);
router.route('/:id')
  .get(getTask)
  .patch(updateTask)
  .delete(deleteTask);

export default router;
