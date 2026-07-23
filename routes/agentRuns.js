
const express = require('express');
const router = express.Router();
const AgentRun = require('../models/agentRun');
const AgentStep = require('../models/agentStep');
const Blog = require('../models/blog');
const { approveDraft, rejectDraft } = require('../services/pipeline');
const { checkForAuthenticationInCookie } = require('../middlewares/authenticatiion');

router.use(checkForAuthenticationInCookie('token'));

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  next();
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required and must be at least 3 characters.',
      });
    }

    const run = await AgentRun.create({
      userId: req.user._id,
      topic: topic.trim(),
      status: 'pending',
    });

    res.status(202).json({
      success: true,
      message: 'Agent pipeline queued. Check back in a minute for results.',
      agentRunId: run._id.toString(),
      redirectUrl: `/agent-runs/${run._id}`,
    });
  } catch (err) {
    console.error('[agentRuns] Create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create agent run.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const runs = await AgentRun.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('topic status createdAt updatedAt writerRetries publishedBlogId plan');

    const pendingCount = runs.filter((r) => r.status === 'awaiting_approval').length;

    res.render('agent-runs', {
      user: req.user,
      runs,
      pendingCount,
    });
  } catch (err) {
    console.error('[agentRuns] List error:', err);
    res.status(500).send('Something went wrong');
  }
});

router.get('/approvals', requireAuth, async (req, res) => {
  try {
    const runs = await AgentRun.find({
      userId: req.user._id,
      status: 'awaiting_approval',
    }).sort({ createdAt: -1 });

    const pendingCount = runs.length;

    res.render('approvals', {
      user: req.user,
      runs,
      pendingCount,
    });
  } catch (err) {
    console.error('[agentRuns] Approvals error:', err);
    res.status(500).send('Something went wrong');
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const run = await AgentRun.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!run) return res.status(404).send('Agent run not found');

    const steps = await AgentStep.find({ agentRunId: run._id }).sort({ createdAt: 1 });

    let publishedBlog = null;
    if (run.publishedBlogId) {
      publishedBlog = await Blog.findById(run.publishedBlogId).select('title slug').lean();
    }

    const pendingCount = await AgentRun.countDocuments({
      userId: req.user._id,
      status: 'awaiting_approval',
    });

    res.render('agent-run-detail', {
      user: req.user,
      run,
      steps,
      publishedBlog,
      pendingCount,
    });
  } catch (err) {
    console.error('[agentRuns] Detail error:', err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { blog } = await approveDraft(req.params.id, req.user._id);

    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        message: 'Draft approved and published!',
        blogSlug: blog.slug,
        blogUrl: `/blog/${blog.slug}`,
      });
    }

    res.redirect(`/blog/${blog.slug}`);
  } catch (err) {
    console.error('[agentRuns] Approve error:', err);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, error: err.message });
    }

    res.redirect(`/agent-runs/${req.params.id}?error=approve_failed`);
  }
});

router.post('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    await rejectDraft(req.params.id, req.user._id, reason);

    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Draft rejected.' });
    }

    res.redirect('/agent-runs?rejected=1');
  } catch (err) {
    console.error('[agentRuns] Reject error:', err);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, error: err.message });
    }

    res.redirect(`/agent-runs/${req.params.id}?error=reject_failed`);
  }
});

router.get('/:id/api', requireAuth, async (req, res) => {
  try {
    const run = await AgentRun.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!run) return res.status(404).json({ success: false, error: 'Not found' });

    const steps = await AgentStep.find({ agentRunId: run._id }).sort({ createdAt: 1 }).lean();

    res.json({ success: true, run, steps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
