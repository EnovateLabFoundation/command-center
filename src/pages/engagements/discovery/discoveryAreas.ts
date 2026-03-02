/**
 * discoveryAreas.ts
 *
 * Static definitions for all 7 discovery framework areas.
 * Each area has a title, description, guided question prompts,
 * and a list of modules it feeds into.
 */

export interface DiscoveryArea {
  index: number;
  title: string;
  description: string;
  prompts: string[];
  feedsInto: string[];
}

export const DISCOVERY_AREAS: DiscoveryArea[] = [
  {
    index: 1,
    title: 'Political Context',
    description:
      'Map the client\'s current political standing, key relationships, and operating environment. Understand how the political landscape has shifted around them.',
    prompts: [
      'What is the client\'s current political position and affiliation status?',
      'Which political relationships are most critical to achieving their objectives?',
      'What legislation, policies, or regulatory changes are directly relevant?',
      'What are the key upcoming political events, elections, or decision points?',
      'How has the political landscape shifted around the client in the last 12 months?',
      'Who are the dominant political actors in their sphere and how do they relate to the client?',
    ],
    feedsInto: ['Power Map', 'Scenario Planner'],
  },
  {
    index: 2,
    title: 'Strategic Objectives',
    description:
      'Define precisely what the client is trying to achieve politically, legislatively, or publicly over the engagement period. Establish metrics for success.',
    prompts: [
      'What are the 3 most critical goals for the next 12 months?',
      'How does the client define success — what events or metrics signal progress?',
      'What is the acceptable timeline and sequencing for these objectives?',
      'What institutional or political changes need to happen for these goals to be met?',
      'What does failure look like, and how sensitive is the client to risk?',
      'Are the objectives publicly stated or privately held — and does that distinction matter?',
    ],
    feedsInto: ['Narrative Matrix', 'Brand Audit'],
  },
  {
    index: 3,
    title: 'Threat Assessment',
    description:
      'Identify all vulnerabilities, adversarial actors, and risk vectors that could undermine the engagement\'s objectives. Surface hidden liabilities early.',
    prompts: [
      'Who are the primary opposition actors and what are their capabilities?',
      'What is the client\'s most significant known vulnerability or controversy?',
      'What historical incidents or associations could be weaponised against the client?',
      'What external events (elections, economic shifts, scandals) pose collateral risk?',
      'Where has the client\'s messaging or positioning previously backfired?',
      'Are there internal factions, leaks, or loyalty risks within the client\'s own organisation?',
    ],
    feedsInto: ['Crisis Protocol', 'Scenario Planner', 'Competitor Profiler'],
  },
  {
    index: 4,
    title: 'Alliance Landscape',
    description:
      'Map the client\'s network of allies, potential coalition partners, neutral parties, and key institutional relationships. Assess reliability and strategic value.',
    prompts: [
      'Who are the client\'s core political allies and how reliable are those relationships?',
      'Which relationships are ideologically aligned versus transactional?',
      'What civil society groups, institutions, or media actors are favourably disposed?',
      'Where are there opportunities to build new coalitions or consolidate existing ones?',
      'Which relationships require active maintenance or are at risk of erosion?',
      'Are there any latent alliances that have not yet been formally activated?',
    ],
    feedsInto: ['Power Map', 'Stakeholder Tracker'],
  },
  {
    index: 5,
    title: 'Communications State',
    description:
      'Assess the client\'s current public messaging, media presence, and brand perception baseline. Understand the existing narrative and what is driving it.',
    prompts: [
      'What is the dominant public narrative about the client at this moment?',
      'How does the media currently frame the client — and has this framing shifted recently?',
      'Which of the client\'s past communications approaches have been most effective?',
      'What messaging has generated backlash, and why?',
      'Who are the key media allies, critics, and neutral voices covering the client?',
      'How does the client\'s digital/social presence reflect or contradict their positioning?',
    ],
    feedsInto: ['Narrative Matrix', 'Brand Audit'],
  },
  {
    index: 6,
    title: 'Institutional Context',
    description:
      'Map the formal institutional environment — the bodies, processes, gatekeepers, and constraints the client must navigate to achieve their objectives.',
    prompts: [
      'Which committees, agencies, or formal bodies are most relevant to the client\'s objectives?',
      'What formal institutional processes must the client navigate?',
      'Who are the institutional gatekeepers and what are their priorities?',
      'What institutional constraints or procedural barriers exist?',
      'How does the client\'s relationship with regulatory or oversight bodies currently stand?',
      'Are there informal institutional networks or back-channel relationships that matter?',
    ],
    feedsInto: ['Governance Comms Planner'],
  },
  {
    index: 7,
    title: 'Non-Negotiables',
    description:
      'Capture the client\'s firm boundaries — positions they cannot move on, language they will never use, and actions they will not take. These become constraints across all modules.',
    prompts: [
      'What issues, topics, or associations must NEVER be publicly linked to the client?',
      'What specific language, framing, or terminology is absolutely prohibited?',
      'Which past controversies or alliances must never be referenced or revisited?',
      'Which endorsements, partnerships, or coalitions would be damaging to the client?',
      'What internal red lines has the client set that must be respected regardless of tactical pressure?',
      'Are there any individuals, groups, or causes the client refuses to be associated with?',
    ],
    feedsInto: ['Narrative Matrix (What We Never Say)', 'All Modules (as constraints)'],
  },
];
