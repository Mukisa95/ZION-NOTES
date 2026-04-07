/**
 * researchAiService.ts
 * All AI calls for the Research Component, built on top of openRouterService.
 */
import { generateText } from './openRouterService';
import { ResearchResource, NoteGenerationConfig, QaConfig } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildResourceContext = (resources: ResearchResource[]): string => {
  const textResources = resources.filter(r => r.content && r.content.trim());
  if (textResources.length === 0) return '';
  return textResources
    .map(r => `--- ${r.category.toUpperCase()}: ${r.name} ---\n${r.content}`)
    .join('\n\n');
};

// ─── Note Generation ──────────────────────────────────────────────────────────

export const generateNotes = async (
  config: NoteGenerationConfig,
  resources: ResearchResource[]
): Promise<string> => {
  const selectedResources = config.selectedResourceIds 
    ? resources.filter(r => config.selectedResourceIds!.includes(r.id))
    : resources;
    
  const context = buildResourceContext(selectedResources);

  const approachMap: Record<string, string> = {
    'resource-grounded':
      'Use ONLY the provided resources as your source. Do not add any external knowledge.',
    'resource-knowledge':
      'Use the provided resources as primary source, supplemented by your general knowledge for broader context.',
    'resource-knowledge-internet':
      'Use the provided resources, your general knowledge, and current best practices to produce the most comprehensive output.',
  };

  const noteTypeMap: Record<string, string> = {
    deep:
      'Create EXHAUSTIVE, thoroughly explained notes. Include underlying principles, edge cases, and connections between concepts. Aim for complete mastery.',
    context:
      'Create CONCISE core-data notes. Essential facts only — maximum density, minimum words. No supplementary explanation.',
    exemplary:
      'Create PEDAGOGICALLY-FOCUSED notes. Every abstract concept must be paired with a practical worked example.',
  };

  const prompt = `You are an expert research assistant generating structured academic notes.

DATA SOURCE: ${approachMap[config.approach]}
TARGET AUDIENCE: ${config.ageGroup} — calibrate vocabulary, sentence structure, and depth accordingly.
NOTE FORMAT: ${noteTypeMap[config.noteType]}${config.topic ? `\nTOPIC FOCUS: ${config.topic}` : ''}${config.customInstructions ? `\nSPECIAL INSTRUCTIONS (FOLLOW DILIGENTLY):\n${config.customInstructions}` : ''}

${context ? `SOURCE MATERIAL:\n${context}\n\n` : ''}

Generate comprehensive, well-structured notes in rich HTML. Use:
- <h2> for main sections
- <h3> for subsections
- <p> for paragraphs
- <ul>/<ol>/<li> for lists
- <strong> for key terms
- <em> for emphasis
- <blockquote> for definitions or important statements

Output ONLY the HTML content. No markdown fences, no preamble.`;

  return generateText(prompt);
};

// ─── Selection Refinement Tools ───────────────────────────────────────────────

export const simplifyText = async (
  selectedHtml: string,
  resources: ResearchResource[]
): Promise<string> => {
  const context = buildResourceContext(resources);
  const prompt = `Rewrite the following HTML passage in simpler, more accessible language while preserving ALL original meaning and facts. Keep the same HTML structure.

Passage:
${selectedHtml}

${context ? `Reference material:\n${context}\n` : ''}
Return only the rewritten HTML.`;
  return generateText(prompt);
};

export const explainDeep = async (
  selectedHtml: string,
  resources: ResearchResource[]
): Promise<string> => {
  const context = buildResourceContext(resources);
  const prompt = `Expand the following passage with deep, granular analysis. Explain the underlying logic, mechanisms, why it matters, and connections to related concepts. Return rich HTML.

Passage:
${selectedHtml}

${context ? `Source context:\n${context}\n` : ''}
Return only the expanded HTML content.`;
  return generateText(prompt);
};

export const summariseText = async (selectedHtml: string): Promise<string> => {
  const prompt = `Condense the following HTML passage into a brief 2-4 sentence HTML overview. Preserve all key facts.

Passage:
${selectedHtml}

Return only the summary HTML.`;
  return generateText(prompt);
};

export const rewriteText = async (selectedHtml: string): Promise<string> => {
  const prompt = `Completely restructure and reframe the following HTML passage. Preserve ALL core information but change the stylistic approach, organisation, and framing for a fresh perspective.

Passage:
${selectedHtml}

Return only the rewritten HTML.`;
  return generateText(prompt);
};

// ─── Test Generation ──────────────────────────────────────────────────────────

export const generateTest = async (
  config: QaConfig,
  resources: ResearchResource[]
): Promise<string> => {
  const selectedResources = config.selectedResourceIds 
    ? resources.filter(r => config.selectedResourceIds!.includes(r.id))
    : resources;
  const context = buildResourceContext(selectedResources);
  const count = config.questionCount || 10;

  const questionTypeDesc =
    config.questionType === 'mixed'
      ? 'a balanced mix of factual recall questions and analytical comprehension questions'
      : config.questionType === 'knowledge'
      ? 'factual recall questions requiring direct answers from the material'
      : 'comprehension questions requiring understanding of how and why things work';

  const sourceDesc =
    config.truthSource === 'resource'
      ? 'Use ONLY the provided resources.'
      : `Topic: "${config.topic || 'general knowledge'}". Use your knowledge.`;

  let formatInstruction = `Format EACH question as HTML exactly like this:
<div class="test-question" style="margin:1em 0; padding:1em; border-left:4px solid #6366f1; background:#f8f7ff;">
  <p><strong>Q[N].</strong> [Question text]</p>
  <p style="color:#6366f1;"><em>Answer:</em> [Detailed correct answer]</p>
</div>`;

  if (config.includeAnswers === false) {
    formatInstruction = `Format EACH question as HTML exactly like this:
<div class="test-question" style="margin:1em 0; padding:1em; border-left:4px solid #6366f1; background:#f8f7ff;">
  <p><strong>Q[N].</strong> [Question text]</p>
</div>
Do NOT include the answers. Provide ONLY the questions.`;
  } else if (config.answerPlacement === 'under') {
    formatInstruction = `Format the test in two distinct sections as HTML:
1. A "Questions" section with all questions formatted exactly like this:
<div class="test-question" style="margin:1em 0; padding:1em; border-left:4px solid #6366f1; background:#f8f7ff;">
  <p><strong>Q[N].</strong> [Question text]</p>
</div>

2. An "Answers" section at the VERY BOTTOM containing all answers formatted exactly like this:
<div class="test-answer" style="margin:1em 0; padding:1em; color:#6366f1;">
  <p><strong>A[N].</strong> [Detailed correct answer]</p>
</div>`;
  }

  const prompt = `Generate exactly ${count} questions for a formal test.

Source: ${sourceDesc}
Question type: ${questionTypeDesc}

${context ? `Resources:\n${context}\n\n` : ''}

${formatInstruction}

Generate all ${count} questions now.`;

  return generateText(prompt);
};

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export const generateQuizQuestion = async (
  config: QaConfig,
  resources: ResearchResource[],
  playerName: string,
  questionHistory: string[]
): Promise<string> => {
  const selectedResources = config.selectedResourceIds 
    ? resources.filter(r => config.selectedResourceIds!.includes(r.id))
    : resources;
  const context = buildResourceContext(selectedResources);
  const questionTypeDesc =
    config.questionType === 'mixed'
      ? 'a question (randomly choosing either a factual recall or an analytical comprehension question)'
      : config.questionType === 'knowledge'
      ? 'a factual recall question'
      : 'a comprehension or analysis question';

  const previousQs =
    questionHistory.length > 0
      ? `\nPreviously asked (do NOT repeat):\n${questionHistory.join('\n')}`
      : '';

  const prompt = `Generate ${questionTypeDesc} for player: ${playerName}.

${context ? `Source material:\n${context}\n` : `Topic: ${config.topic || 'general knowledge'}\n`}${previousQs}

Return ONLY the question text. No numbering, no prefix, no extra commentary.`;

  return generateText(prompt);
};

export const validateQuizAnswer = async (
  question: string,
  playerAnswer: string,
  resources: ResearchResource[]
): Promise<{ correct: boolean; explanation: string; correctAnswer: string }> => {
  const context = buildResourceContext(resources);

  const prompt = `Evaluate this quiz answer.

Question: ${question}
Player's Answer: ${playerAnswer}

${context ? `Reference material:\n${context}\n` : ''}

Respond with ONLY a JSON object in this exact shape:
{
  "correct": true,
  "correctAnswer": "the complete correct answer",
  "explanation": "brief explanation of why the answer is correct or incorrect"
}`;

  try {
    const raw = await generateText(prompt);
    const cleaned = raw.trim().replace(/```json\s*|```/g, '');
    return JSON.parse(cleaned);
  } catch {
    return {
      correct: false,
      correctAnswer: 'Unable to determine',
      explanation: 'Could not validate automatically. Please check manually.',
    };
  }
};
