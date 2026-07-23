
const cron = require('node-cron');
const { chat } = require('./litellm');
const PostAnalytics = require('../models/postAnalytics');
const Blog = require('../models/blog');
const AgentRun = require('../models/agentRun');
const AgentStep = require('../models/agentStep');


async function runMetaCritic() {
  try {
    console.log('[analyticsAgent] Running meta-critic...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rejectionSteps = await AgentStep.find({
      agentName: 'critic',
      stepType: 'decision',
      'output.verdict': 'reject',
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select('output')
      .limit(50)
      .lean();

    if (rejectionSteps.length === 0) {
      console.log('[analyticsAgent] No rejection data available for meta-critic');
      return;
    }

    const rejectionReasons = rejectionSteps
      .flatMap((s) => s.output?.reasons || [])
      .filter(Boolean);

    const metaPrompt = `You are a meta-critic improving an AI content generation system.

Based on these common rejection reasons from the past 30 days:
${rejectionReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Analyze patterns and suggest specific improvements to:
1. The writer agent's instructions
2. The planning process
3. Research depth requirements

Format your response as a brief report with actionable bullet points.`;

    const analysis = await chat(
      [
        { role: 'system', content: 'You are a meta-critic improving an AI system based on historical data.' },
        { role: 'user', content: metaPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    console.log('[analyticsAgent] Meta-critic analysis completed');
    console.log('[analyticsAgent] Analysis:', analysis.substring(0, 500));
  } catch (err) {
    console.error('[analyticsAgent] Meta-critic error:', err.message);
  }
}


async function runAnalyticsAgent() {
  try {
    console.log('[analyticsAgent] Running weekly analytics review...');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const analyticsData = await PostAnalytics.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: '$blogId',
          totalViews: { $sum: '$views' },
          totalReadSeconds: { $sum: '$totalReadSeconds' },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: 20 },
    ]);

    if (analyticsData.length === 0) {
      console.log('[analyticsAgent] No analytics data for the last 7 days');
      return;
    }

    const blogIds = analyticsData.map((a) => a._id);
    const blogs = await Blog.find({ _id: { $in: blogIds } }).select('title slug').lean();
    const blogMap = Object.fromEntries(blogs.map((b) => [b._id.toString(), b]));

    const performanceSummary = analyticsData.map((a) => {
      const blog = blogMap[a._id?.toString()];
      return `- "${blog?.title || 'Unknown'}" — ${a.totalViews} views, avg read time: ${Math.round(a.totalReadSeconds / 60)} min`;
    });

    const analysisPrompt = `You are a content strategy analyst reviewing blog post performance.

Recent post performance (last 7 days):
${performanceSummary.join('\n')}

Based on this data:
1. Identify the top 3 performing content themes
2. Identify 2 underperforming posts and suggest improvements
3. Recommend 5 new blog topics to plan based on what's working

Keep recommendations specific and actionable. Format as JSON:
{
  "topThemes": ["theme1", "theme2", "theme3"],
  "underperforming": [{ "title": "...", "suggestion": "..." }],
  "recommendedTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}`;

    const analysisRaw = await chat(
      [
        { role: 'system', content: 'You are a content strategy analyst. Respond with valid JSON only.' },
        { role: 'user', content: analysisPrompt },
      ],
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    );

    let analysis;
    try {
      const jsonMatch = analysisRaw.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, analysisRaw];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      analysis = { topThemes: [], underperforming: [], recommendedTopics: [], raw: analysisRaw };
    }

    console.log('[analyticsAgent] Weekly analysis complete:', JSON.stringify(analysis, null, 2));
    return analysis;
  } catch (err) {
    console.error('[analyticsAgent] Weekly analytics error:', err.message);
  }
}


function startAnalyticsScheduler() {
  cron.schedule('0 0 * * 0', () => {
    console.log('[analyticsAgent] Weekly cron triggered');
    runAnalyticsAgent().catch(console.error);
  });

  cron.schedule('0 1 1 * *', () => {
    console.log('[analyticsAgent] Monthly meta-critic cron triggered');
    runMetaCritic().catch(console.error);
  });

  console.log('[analyticsAgent] Scheduler started (weekly analytics + monthly meta-critic)');
}

module.exports = { startAnalyticsScheduler, runAnalyticsAgent, runMetaCritic };
