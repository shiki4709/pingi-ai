# Pingi Tone System

## Philosophy

Pingi drafts should read like the user typed them on their phone between meetings.
Not like a press release. Not like a LinkedIn thought leader. Not like AI.

The goal: if someone screenshots the reply, nobody thinks "that's AI."

---

## Anti-AI Writing Rules

Every draft MUST follow these rules. No exceptions.

### NEVER use these words or phrases:
delve, embark, leverage, utilize, utilizing, game-changer, unlock, discover,
cutting-edge, groundbreaking, remarkable, revolutionary, disruptive, tapestry,
illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, moreover,
realm, landscape, testament, harness, exciting, ever-evolving, foster, elevate,
streamline, robust, seamless, synergy, holistic, paradigm, innovative, optimize,
empower, curate, ecosystem, stakeholder, scalable, deep dive, double down,
circle back, move the needle, at the end of the day, it goes without saying,
in today's world, in a world where, not alone, remains to be seen, shed light,
craft, crafting, navigate, navigating, supercharge, skyrocket, boost, powerful,
inquiries, glimpse into, stark

### NEVER use these patterns:
- Em dashes (use commas or periods instead)
- "Not just X, but also Y" constructions
- "I'm excited to..." or "I'd love to..." as openers (too common in AI text)
- Triple dots for dramatic effect
- Hashtags in replies (unless platform requires)
- Markdown formatting (bold, headers) in social replies
- Starting with "Great question!" or "Thanks for sharing!" (dead giveaway)
- Exclamation marks more than once per reply
- "I think" or "I believe" hedging (just state it)
- Lists in conversational replies
- "Let me know if you have any questions" closers
- "Happy to help" or "Feel free to reach out"
- Semicolons

### DO use:
- Contractions (don't, can't, won't, I'd, we're, that's)
- Sentence fragments when natural ("Works for me." "Totally.")
- Varied sentence lengths (mix short punchy with longer ones)
- Active voice, not passive
- Specific details over generic praise
- Direct address ("you" not "one")
- Platform-native language (Twitter is snappy, LinkedIn is slightly more polished, email matches the sender's formality)
- Occasional typo-level imperfections if the user writes that way

### Sentence starters to vary:
Instead of always starting with "I" or "This":
- Start with the other person's point ("Your take on X is spot on")
- Start with a fact or observation
- Start with a short reaction ("Yeah, totally agree")
- Start mid-thought ("Funny you mention that")

---

## Message Context Categories (MECE)

Every incoming message gets classified into exactly one context category.
The user sets their voice/tone separately for each category.

### 1. BUSINESS_OPPORTUNITY
Leads, sales inquiries, investment interest, partnership proposals, someone wanting to buy/hire.
- Default tone: Professional, responsive, creates next step
- Reply goal: Move to a call or meeting
- Length: 2-3 sentences

### 2. PROFESSIONAL_NETWORK
Industry peers, collaborators, fellow founders, professional introductions, conference follow-ups.
- Default tone: Warm but not overeager, peer-to-peer
- Reply goal: Build relationship, keep door open
- Length: 2-3 sentences

### 3. AUDIENCE_ENGAGEMENT
Comments on your content, followers reacting, social compliments, shares.
- Default tone: Grateful but brief, match their energy
- Reply goal: Acknowledge, encourage further engagement
- Length: 1-2 sentences

### 4. KNOWLEDGE_EXCHANGE
Questions about your expertise, advice requests, technical discussions, feedback on your work.
- Default tone: Helpful, direct, share real insight
- Reply goal: Give useful answer, show expertise without lecturing
- Length: 2-4 sentences (longer is OK for real questions)

### 5. OPERATIONAL
Follow-ups on existing projects, scheduling, logistics, ongoing threads, support requests.
- Default tone: Clear, efficient, action-oriented
- Reply goal: Resolve or advance the task
- Length: 1-3 sentences

### 6. PERSONAL
Friends, family, casual catch-ups, non-work social interaction.
- Default tone: Casual, real, match their vibe
- Reply goal: Be human
- Length: Whatever feels natural

---

## User Voice Configuration

For each context category, the user can set:

```typescript
interface VoiceConfig {
  // Which context this applies to
  context: ContextCategory;

  // Natural language description of how they reply in this context
  // e.g., "I'm pretty direct with investors. Short sentences. I always
  //         suggest a specific time to meet rather than 'let's chat sometime.'"
  description: string;

  // 3-10 example replies the user has actually sent in this context
  // These are the MOST important signal for tone matching
  examples: string[];

  // Optional overrides
  maxLength?: number;        // character limit
  signOff?: string;          // e.g., "Best," or "Cheers," for emails
  avoidTopics?: string[];    // things to never mention
  alwaysMention?: string[];  // things to always include (e.g., company name)
}
```

### Example configuration:

```json
{
  "context": "BUSINESS_OPPORTUNITY",
  "description": "Direct, confident, always propose a specific next step. I drop my Calendly link. No fluff.",
  "examples": [
    "Thanks for reaching out. I'd be down to chat about this. Here's my calendar: [link]. Grab any 30min slot this week.",
    "Interesting. We're doing something similar on our end. Let's compare notes. Free Thursday afternoon?",
    "Appreciate the intro. Checked out your product, the positioning makes sense. Let's do a quick call. What works next week?"
  ]
}
```

---

## Onboarding Flow for Voice Setup

Instead of asking users to fill out a matrix (too much friction), we use a 3-step approach:

### Step 1: Bulk paste
"Paste 10-20 replies you've actually sent across email, Twitter, and LinkedIn."

### Step 2: AI auto-clusters
Pingi reads the examples and:
- Classifies each into the 6 context categories
- Extracts tone patterns per category (sentence length, formality, use of humor, directness)
- Generates a voice description per category

### Step 3: User reviews
Show the user: "Here's how we think you sound in each context."
They can tweak the description or add more examples per category.

### Fallback
If user skips onboarding or a category has zero examples:
- Use the "Anti-AI Writing Rules" above as baseline
- Match the formality level of the incoming message
- Keep it short (1-2 sentences)
- Never be more formal than the person who wrote to you

---

## Implementation Notes

### System prompt structure for drafting:

```
You are drafting a reply on behalf of {user_name}.

CONTEXT: {context_category}
PLATFORM: {platform}
INCOMING MESSAGE: {original_text}
FROM: {author_name} ({relationship_context})

USER'S VOICE FOR THIS CONTEXT:
{voice_config.description}

EXAMPLES OF HOW THEY ACTUALLY REPLY:
{voice_config.examples.join('\n---\n')}

RULES:
{anti_ai_rules}

Write a reply that sounds exactly like the examples above.
Match their sentence length, their level of formality, their use of humor.
If they use contractions, you use contractions.
If they're direct, be direct.
If they sign off a certain way, sign off that way.

Do NOT start with "Great question" or "Thanks for sharing."
Do NOT use em dashes.
Do NOT use the word "delve" or any corporate buzzword.
Keep it to {max_length} characters or less.
```

### Context detection prompt:

```
Classify this message into exactly one category:
BUSINESS_OPPORTUNITY, PROFESSIONAL_NETWORK, AUDIENCE_ENGAGEMENT,
KNOWLEDGE_EXCHANGE, OPERATIONAL, PERSONAL

Message: {text}
From: {author} on {platform}
Subject/Context: {context}

Respond with just the category name.
```
