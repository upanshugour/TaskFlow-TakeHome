import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../src/app.js';
import { createAuthRateLimiter } from '../src/middleware/authRateLimit.js';
import Task from '../src/models/Task.js';
import User from '../src/models/User.js';

const suite = describe('TaskFlow API', () => {
  let mongoServer;

  before(async () => {
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await Promise.all([User.syncIndexes(), Task.syncIndexes()]);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer?.stop();
  });

  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Task.deleteMany({})]);
  });

  async function register(email = 'person@example.com', password = 'correct-horse-42') {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email, password });
    assert.equal(response.status, 201);
    return response.body.data;
  }

  async function createTask(token, fields = { title: 'Prepare assessment' }) {
    return request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(fields);
  }

  it('keeps the health endpoint available', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
  });

  it('registers a normalized user and never returns a password hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Person@Example.COM ', password: 'correct-horse-42' });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.user.email, 'person@example.com');
    assert.equal(typeof response.body.data.token, 'string');
    assert.equal('passwordHash' in response.body.data.user, false);
    assert.equal('password' in response.body.data.user, false);
    const storedUser = await User.findOne({ email: 'person@example.com' }).select('+passwordHash');
    assert.ok(storedUser.passwordHash);
    assert.notEqual(storedUser.passwordHash, 'correct-horse-42');
  });

  it('rejects duplicate registration with a safe conflict response', async () => {
    await register();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'PERSON@example.com', password: 'correct-horse-42' });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'EMAIL_IN_USE');
  });

  it('rejects invalid registration input', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  it('does not create an account when JWT configuration is missing', async () => {
    const configuredSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    let response;
    try {
      response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'unconfigured@example.com', password: 'correct-horse-42' });
    } finally {
      process.env.JWT_SECRET = configuredSecret;
    }

    assert.equal(response.status, 500);
    assert.equal(await User.countDocuments({ email: 'unconfigured@example.com' }), 0);
  });

  it('logs in with valid credentials and rejects invalid credentials', async () => {
    await register();
    const valid = await request(app)
      .post('/api/auth/login')
      .send({ email: 'PERSON@example.com', password: 'correct-horse-42' });
    const invalid = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: 'wrong-password' });

    assert.equal(valid.status, 200);
    assert.equal(typeof valid.body.data.token, 'string');
    assert.equal('passwordHash' in valid.body.data.user, false);
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('protects the current-user endpoint and rejects invalid tokens', async () => {
    const { user, token } = await register();
    const missing = await request(app).get('/api/auth/me');
    const valid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const invalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    assert.equal(missing.status, 401);
    assert.equal(valid.status, 200);
    assert.equal(valid.body.data.user.id, user.id);
    assert.equal('passwordHash' in valid.body.data.user, false);
    assert.equal(invalid.status, 401);
  });

  it('rejects unauthenticated access to every task endpoint and invalid bearer tokens', async () => {
    const taskId = '507f1f77bcf86cd799439011';
    const responses = await Promise.all([
      request(app).get('/api/tasks'),
      request(app).post('/api/tasks').send({ title: 'Unauthenticated task' }),
      request(app).get(`/api/tasks/${taskId}`),
      request(app).patch(`/api/tasks/${taskId}`).send({ title: 'Changed task' }),
      request(app).delete(`/api/tasks/${taskId}`),
      request(app).get('/api/tasks').set('Authorization', 'Bearer invalid-token'),
    ]);

    for (const response of responses) {
      assert.equal(response.status, 401);
    }
    assert.equal(responses[5].body.error.code, 'INVALID_TOKEN');
  });

  it('returns a safe response when the authentication rate limit is exceeded', async () => {
    const rateLimitApp = express();
    rateLimitApp.use(createAuthRateLimiter({
      windowMs: 60_000,
      limit: 1,
      skipSuccessfulRequests: false,
    }));
    rateLimitApp.post('/login', (_req, res) => res.status(200).json({ ok: true }));

    const first = await request(rateLimitApp).post('/login');
    const limited = await request(rateLimitApp).post('/login');

    assert.equal(first.status, 200);
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error.code, 'RATE_LIMITED');
    assert.match(limited.body.error.message, /try again later/i);
  });

  it('supports owned task create, read, update, and delete', async () => {
    const { token } = await register();
    const created = await createTask(token, {
      title: '  Prepare assessment  ',
      description: 'Review API design',
      status: 'in_progress',
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.task.title, 'Prepare assessment');
    assert.equal(created.body.data.task.status, 'in_progress');

    const taskId = created.body.data.task._id;
    const fetched = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    const updated = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });
    const deleted = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.data.task.owner, created.body.data.task.owner);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.task.status, 'done');
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.data.deleted, true);
    assert.equal(await Task.countDocuments({ _id: taskId }), 0);
  });

  it('validates task fields and rejects invalid task IDs', async () => {
    const { token } = await register();
    const invalidCreate = await createTask(token, { title: '  ', status: 'blocked' });
    const invalidPatch = await request(app)
      .patch('/api/tasks/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`)
      .send({ owner: '507f1f77bcf86cd799439011' });
    const invalidId = await request(app)
      .get('/api/tasks/not-an-id')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(invalidCreate.status, 400);
    assert.equal(invalidPatch.status, 400);
    assert.equal(invalidId.status, 400);
  });

  it('filters tasks by status and searches title and description', async () => {
    const { token } = await register();
    await createTask(token, { title: 'Write tests', status: 'todo' });
    await createTask(token, { title: 'Review feature', description: 'API security checklist', status: 'done' });
    await createTask(token, { title: 'Unrelated task', status: 'done' });

    const byStatus = await request(app)
      .get('/api/tasks?status=done')
      .set('Authorization', `Bearer ${token}`);
    const bySearch = await request(app)
      .get('/api/tasks?q=security')
      .set('Authorization', `Bearer ${token}`);
    const invalidFilter = await request(app)
      .get('/api/tasks?status=blocked')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(byStatus.status, 200);
    assert.equal(byStatus.body.data.tasks.length, 2);
    assert.equal(bySearch.status, 200);
    assert.equal(bySearch.body.data.tasks.length, 1);
    assert.equal(invalidFilter.status, 400);
  });

  it('does not expose or mutate another user’s tasks', async () => {
    const owner = await register('owner@example.com');
    const other = await register('other@example.com');
    const created = await createTask(owner.token, { title: 'Private task' });
    const taskId = created.body.data.task._id;

    const list = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${other.token}`);
    const get = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other.token}`);
    const patch = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ title: 'Tampered task' });
    const remove = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${other.token}`);

    assert.equal(list.status, 200);
    assert.equal(list.body.data.tasks.length, 0);
    assert.equal(get.status, 404);
    assert.equal(patch.status, 404);
    assert.equal(remove.status, 404);
    assert.equal((await Task.findById(taskId)).title, 'Private task');
  });
});

export { suite };
