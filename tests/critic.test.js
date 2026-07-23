
jest.mock('../models/agentStep', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'mock-step-id' }),
}));

jest.mock('../services/litellm', () => ({
  chat: jest.fn(),
}));

const { chat } = require('../services/litellm');
const { runCritic } = require('../services/critic');


const MOCK_PLAN = {
  title: 'The Future of Renewable Energy',
  targetKeywords: ['solar power', 'wind energy', 'sustainability'],
  seoFocus: 'Explaining renewable energy trends for a general audience',
  tone: 'informative',
};

const HIGH_QUALITY_DRAFT = `# The Future of Renewable Energy

Renewable energy has experienced unprecedented growth over the past decade. 
Solar and wind power now account for over 30% of global electricity generation, 
a figure that was less than 5% just 20 years ago.

## Solar Power Leading the Charge

The cost of solar panels has dropped by over 90% since 2010, making it the 
cheapest source of electricity in history according to the International Energy Agency.
This dramatic price reduction has spurred installation across homes, businesses, and utilities.

## Wind Energy Scaling New Heights

Offshore wind farms are now capable of generating electricity for millions of homes.
The United Kingdom's Hornsea Project produces over 1.2 GW of capacity, enough to power
over 1 million British homes.

## The Road Ahead

Battery storage technology is the next frontier. As costs decline and capacity increases,
the intermittency challenge of renewable energy becomes increasingly manageable.

By 2035, analysts project that renewables could supply over 60% of global electricity demand.
`;

const LOW_QUALITY_DRAFT = `# Renewable Energy

Renewable energy is good. Solar panels use the sun. Wind turbines use wind.
These are good for the environment. We should use more renewable energy.
It is the future. Thank you for reading this blog post about renewable energy.`;

const MOCK_SOURCES = [
  { query: 'renewable energy trends 2024', summary: 'Renewable energy grew 30% globally', keyPoints: [] },
];


describe('Critic Agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('approves a high-quality draft', async () => {
    chat.mockResolvedValueOnce(JSON.stringify({
      scores: { accuracy: 9, tone: 8, structure: 9, seo: 8, overall: 8.5 },
      verdict: 'approve',
      reasons: [],
      improvements: [],
    }));

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, MOCK_SOURCES);

    expect(result.verdict).toBe('approve');
    expect(result.score).toBeGreaterThanOrEqual(6.5);
    expect(result.reasons).toHaveLength(0);
  });

  test('rejects a low-quality draft with reasons', async () => {
    chat.mockResolvedValueOnce(JSON.stringify({
      scores: { accuracy: 4, tone: 3, structure: 3, seo: 3, overall: 3.25 },
      verdict: 'reject',
      reasons: ['Content is too shallow and lacks specific data', 'No sources cited', 'Poor structure with no subheadings'],
      improvements: ['Add specific statistics and data points', 'Include at least 3 sections with proper headings', 'Use target keywords naturally in the content'],
    }));

    const result = await runCritic('mock-run-id', LOW_QUALITY_DRAFT, MOCK_PLAN, MOCK_SOURCES);

    expect(result.verdict).toBe('reject');
    expect(result.score).toBeLessThan(6.5);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  test('overall score determines verdict consistently', async () => {
    const borderlineScore = 6.0;
    chat.mockResolvedValueOnce(JSON.stringify({
      scores: { accuracy: 6, tone: 6, structure: 6, seo: 6, overall: borderlineScore },
      verdict: 'reject',
      reasons: ['Content meets minimum quality but lacks depth'],
      improvements: ['Expand each section with more detail'],
    }));

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, []);

    expect(result.score).toBe(borderlineScore);
    expect(result.verdict).toBe('reject');
  });

  test('falls back gracefully on LLM parse error', async () => {
    chat.mockResolvedValueOnce('This is not valid JSON at all!');

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, []);

    expect(result.verdict).toBe('approve');
    expect(result.score).toBeGreaterThan(0);
  });

  test('handles LLM API failure gracefully', async () => {
    chat.mockRejectedValueOnce(new Error('API rate limit exceeded'));

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, []);

    expect(result).toBeDefined();
    expect(result.verdict).toBeDefined();
    expect(['approve', 'reject']).toContain(result.verdict);
  });
});

describe('Critic Agent — Score Consistency', () => {
  test('overall score is a number between 0 and 10', async () => {
    chat.mockResolvedValueOnce(JSON.stringify({
      scores: { accuracy: 7, tone: 8, structure: 7, seo: 7, overall: 7.25 },
      verdict: 'approve',
      reasons: [],
      improvements: [],
    }));

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, MOCK_SOURCES);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  test('criticResult contains all required fields', async () => {
    chat.mockResolvedValueOnce(JSON.stringify({
      scores: { accuracy: 7, tone: 7, structure: 7, seo: 7, overall: 7 },
      verdict: 'approve',
      reasons: [],
      improvements: [],
    }));

    const result = await runCritic('mock-run-id', HIGH_QUALITY_DRAFT, MOCK_PLAN, MOCK_SOURCES);

    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('improvements');
    expect(result).toHaveProperty('criticResult');
  });
});
