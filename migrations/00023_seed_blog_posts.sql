-- Migration: 00023_seed_blog_posts.sql
-- Seed initial blog posts from hardcoded data
-- These were previously in src/data/blog-posts.ts
-- Run AFTER 00022_create_blog_posts_table.sql

INSERT INTO blog_posts (title, slug, description, content, category, author_name, status, published_at, created_at, updated_at)
VALUES
(
  'Welcome to Code for Compassion Campus',
  'welcome-to-c4c-campus',
  'Introducing our global AI innovation hub — training developers to build responsible, impact-driven technology for animal advocacy, climate action, and AI safety.',
  '<p>We''re thrilled to officially launch Code for Compassion Campus — a global AI innovation hub dedicated to training the next generation of developers who build technology that matters.</p>

<h2>Why C4C Campus?</h2>
<p>The world doesn''t need more apps that optimise ad clicks. It needs engineers who can build AI systems that protect animals from cruelty, hold polluters accountable, and ensure AI itself remains safe and aligned with human values.</p>
<p>That''s what we''re here to do. C4C Campus offers three pathways for developers at every level:</p>

<ul>
<li><strong>Bootcamp</strong> — A free, self-paced 10-week course for beginners. No coding experience required. Learn to build no-code and low-code AI tools for social impact.</li>
<li><strong>Global Hackathons</strong> — Events around the world where teams build working prototypes in days, not months. Find your team, test your ideas, ship something real.</li>
<li><strong>Full-Time Accelerator</strong> — 12 weeks in-person at our Bengaluru campus. Take your prototype to production with mentorship, compute resources, and connections to the movement.</li>
</ul>

<h2>Based in Bengaluru, Open to the World</h2>
<p>Our physical campus is at The Yard coworking space in Indiranagar, Bengaluru — but our bootcamp is fully remote, and our hackathons happen globally. We believe talent is everywhere; opportunity shouldn''t require relocation.</p>

<h2>What Makes Us Different</h2>
<p>We don''t teach AI in a vacuum. Every project, every assignment, every hackathon challenge connects to real-world impact. Students work on actual problems faced by advocacy organisations — not toy datasets or academic exercises.</p>
<p>Our curriculum is built around three tracks: animal advocacy, climate action, and AI safety. You pick the cause you care about and build tools that serve it.</p>

<h2>Get Involved</h2>
<p>Applications are open year-round. Whether you''re a complete beginner or an experienced developer looking to apply your skills to something meaningful, there''s a place for you here.</p>',
  'Announcements',
  'C4C Team',
  'published',
  '2026-02-10T00:00:00Z',
  '2026-02-10T00:00:00Z',
  '2026-02-10T00:00:00Z'
),
(
  'Building AI Tools for Animal Advocacy: Where to Start',
  'ai-tools-for-animal-advocacy',
  'A practical overview of how AI is being used to protect animals — from supply chain transparency to rescue coordination — and how you can contribute.',
  '<p>Animal advocacy organisations are increasingly turning to technology to scale their impact. But most lack the engineering resources to build the tools they need. That''s where you come in.</p>

<h2>The Problem</h2>
<p>There are over 100 animal advocacy organisations worldwide doing critical work — investigating factory farms, running rescue operations, lobbying for policy change, and educating the public. Most of them rely on manual processes, spreadsheets, and off-the-shelf tools that weren''t built for their needs.</p>

<h2>Where AI Can Help</h2>
<p>Here are some of the areas where AI is already making a difference:</p>

<h3>Supply Chain Transparency</h3>
<p>Machine learning models can analyse satellite imagery, shipping data, and corporate filings to trace animal products through global supply chains. This helps investigators identify where animals are being harmed and hold companies accountable.</p>

<h3>Sentiment Analysis</h3>
<p>Natural language processing can monitor public discourse about animal rights, track media coverage, and measure the impact of advocacy campaigns in real time.</p>

<h3>Campaign Automation</h3>
<p>AI-powered tools can help organisations personalise outreach, optimise petition timing, and identify the most effective messaging for different audiences.</p>

<h3>Rescue Coordination</h3>
<p>When natural disasters or industrial accidents put animals at risk, AI can help coordinate rescue efforts by analysing satellite imagery, predicting affected areas, and optimising resource deployment.</p>

<h2>How to Get Started</h2>
<p>You don''t need to be an ML researcher to build useful tools. Many of the most impactful projects use existing APIs and models — the skill is in understanding the problem deeply enough to apply the right tool.</p>
<p>Our bootcamp covers the fundamentals. Our hackathons give you a chance to build real prototypes with real users. And our accelerator takes the best projects to production.</p>',
  'Technical',
  'C4C Team',
  'published',
  '2026-02-05T00:00:00Z',
  '2026-02-05T00:00:00Z',
  '2026-02-05T00:00:00Z'
),
(
  'Our First Global Hackathon: What We Built',
  'first-hackathon-recap',
  'A look back at our inaugural hackathon — the teams, the projects, and the prototypes that are now heading into development.',
  '<p>Our first global hackathon brought together developers, designers, and advocates from across the world to build AI tools for social impact. Here''s what happened.</p>

<h2>By the Numbers</h2>
<ul>
<li>Participants from 12 countries</li>
<li>Teams formed across all three tracks</li>
<li>Working prototypes demoed on the final day</li>
</ul>

<h2>Standout Projects</h2>

<h3>Track: Animal Advocacy</h3>
<p>One team built a browser extension that flags products linked to factory farming in online shopping results. Using a combination of supply chain databases and NLP analysis of corporate sustainability reports, the tool gives consumers real-time information about the animal welfare implications of their purchases.</p>

<h3>Track: Climate Action</h3>
<p>A team of three built a greenwashing detector — a tool that analyses corporate climate pledges against their actual emissions data and supply chain practices. The prototype used GPT-based analysis of annual reports combined with publicly available emissions databases.</p>

<h3>Track: AI Safety</h3>
<p>A solo developer created an adversarial prompt testing framework that automatically probes AI chatbots for harmful outputs. The tool generates test cases, runs them against target models, and produces a safety scorecard with specific recommendations for improvement.</p>

<h2>What''s Next</h2>
<p>Several teams from the hackathon are now applying to our accelerator programme to take their prototypes to production. We''ll be announcing the next hackathon date soon — follow us for updates.</p>',
  'Announcements',
  'C4C Team',
  'published',
  '2026-01-28T00:00:00Z',
  '2026-01-28T00:00:00Z',
  '2026-01-28T00:00:00Z'
),
(
  'From Bootcamp to Accelerator: One Student''s Journey',
  'from-bootcamp-to-accelerator',
  'How a bootcamp graduate went from zero coding experience to building an AI tool for wildlife monitoring — and what she learned along the way.',
  '<p>When Priya joined the C4C bootcamp, she had no coding experience. She worked in wildlife conservation and was frustrated by how much of her work involved manual data entry and guesswork. Six months later, she''s building an AI-powered wildlife monitoring system.</p>

<h2>Starting from Zero</h2>
<p>"I honestly didn''t think I could learn to code," Priya says. "I''d tried online courses before but always dropped off after a few weeks. The C4C bootcamp was different because everything I was building was connected to something I actually cared about."</p>
<p>The bootcamp''s project-based approach meant that from week one, Priya was building tools related to animal advocacy. Her first project was a simple dashboard that visualised wildlife sighting data from her conservation organisation.</p>

<h2>Finding the Problem</h2>
<p>During the bootcamp, Priya identified a real gap in her organisation''s workflow: they spent hours manually reviewing camera trap footage to identify species and count animals. She wondered if AI could help.</p>
<p>"I didn''t even know what computer vision was when I started. But the bootcamp introduced us to existing APIs and tools that could do image classification. I realised I didn''t need to build a model from scratch — I just needed to connect the right pieces."</p>

<h2>Building the Prototype</h2>
<p>Using no-code tools and existing computer vision APIs, Priya built a prototype that could automatically sort camera trap images by species, flag unusual sightings, and generate reports for her team.</p>
<p>The prototype was rough, but it worked well enough to get her organisation excited. That''s when she applied to the accelerator.</p>

<h2>What''s Next</h2>
<p>Priya is now part of the accelerator cohort in Bengaluru, working with mentors to turn her prototype into a production-ready tool. Her goal: build something that any conservation organisation can use, not just her own.</p>
<p>"The biggest thing I''ve learned is that you don''t need to be a genius programmer to build something useful. You need to understand the problem deeply and be willing to learn as you go."</p>',
  'Student Stories',
  'C4C Team',
  'published',
  '2026-01-20T00:00:00Z',
  '2026-01-20T00:00:00Z',
  '2026-01-20T00:00:00Z'
),
(
  'Ethical AI Development: Our Guiding Principles',
  'ethical-ai-development-principles',
  'The principles that guide how we teach and build AI at C4C Campus — because technology without ethics is just a faster way to cause harm.',
  '<p>AI is not neutral. Every model, every dataset, every deployment decision embeds values — whether we''re conscious of them or not. At C4C Campus, we teach developers to be intentional about the values their technology embodies.</p>

<h2>Our Principles</h2>

<h3>1. Impact First, Technology Second</h3>
<p>We don''t start with "what can AI do?" — we start with "what problem needs solving?" The technology is a means, not an end. If a spreadsheet solves the problem better than a neural network, use the spreadsheet.</p>

<h3>2. Centre the Affected</h3>
<p>The communities and beings affected by a system should have a voice in how it''s designed. For animal advocacy tools, this means working closely with organisations on the ground. For climate tools, it means understanding the communities most affected by environmental destruction.</p>

<h3>3. Fail Safe, Not Fail Silent</h3>
<p>When AI systems make mistakes — and they will — the failure mode matters. A content moderation system that occasionally lets harmful content through is dangerous. One that occasionally over-flags content is annoying but safe. We teach students to design for safe failure modes.</p>

<h3>4. Transparency by Default</h3>
<p>Users should know when they''re interacting with AI, what data is being used, and how decisions are being made. Black-box systems erode trust and make accountability impossible.</p>

<h3>5. Question the Dataset</h3>
<p>Every dataset reflects the biases of the people and systems that created it. We teach students to interrogate their data: Who collected it? What''s missing? Whose perspective is centred? What harm could come from these gaps?</p>

<h3>6. Build for the Long Term</h3>
<p>Quick hacks and shortcuts create technical debt that eventually becomes ethical debt. We teach sustainable engineering practices because the movements we serve need tools that work reliably for years, not demos that break after a week.</p>

<h2>Putting Principles into Practice</h2>
<p>These aren''t just posters on the wall. Every project in our bootcamp, hackathons, and accelerator is evaluated against these principles. We conduct ethics reviews as part of our development process, and our mentors actively push teams to consider the implications of their design decisions.</p>',
  'Technical',
  'C4C Team',
  'published',
  '2026-01-12T00:00:00Z',
  '2026-01-12T00:00:00Z',
  '2026-01-12T00:00:00Z'
),
(
  'Introducing ARCC: The Animal Rights Coding Camp',
  'arcc-pre-accelerator-announcement',
  'A new 4-week pre-accelerator programme specifically for teams building technology to protect animals. Arrive with a prototype, pitch to investors in week one.',
  '<p>We''re launching a new programme specifically for teams building technology for animal protection: the Animal Rights Coding Camp (ARCC).</p>

<h2>What is ARCC?</h2>
<p>ARCC is an intensive 4-week pre-accelerator for teams who already have a working prototype and are ready to pitch to investors. It''s designed as a fast-track pathway into our full 12-week accelerator.</p>

<h2>How It Works</h2>
<p>Week 1 is all about pitching. You arrive at our Bengaluru campus, refine your pitch with mentors, and present to investors by the end of the week. This isn''t a practice run — these are real funders looking for projects to support.</p>
<p>Weeks 2-3 are focused on building. Based on feedback from investors and mentors, you refine your product, run user tests with movement organisations, and iterate fast.</p>
<p>Week 4 is graduation. Programme leads assess whether your project is ready for the full accelerator. Teams that graduate move directly into the next cohort. Teams that need more technical development are routed to our bootcamp for additional training.</p>

<h2>What We Provide</h2>
<ul>
<li>Accommodation in Bengaluru for the 4-week programme</li>
<li>Meals at the Campus cafe</li>
<li>Dedicated compute and infrastructure resources</li>
<li>Technical mentorship from Open Paws and Electric Sheep</li>
<li>Direct access to investors in week 1</li>
<li>User testing sessions with animal protection organisations</li>
</ul>

<h2>Entry Requirements</h2>
<p>ARCC isn''t for beginners. You need:</p>
<ul>
<li>A working prototype you can demo on day one</li>
<li>A clear problem statement focused on animal protection</li>
<li>At least one team member who can be in-person in Bengaluru for 4 weeks</li>
</ul>

<h2>Apply Now</h2>
<p>Applications are open. Apply through our accelerator form and select the ARCC pre-accelerator option.</p>',
  'Announcements',
  'C4C Team',
  'published',
  '2026-01-05T00:00:00Z',
  '2026-01-05T00:00:00Z',
  '2026-01-05T00:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;

-- Verify seeded data
SELECT id, title, status, published_at FROM blog_posts ORDER BY published_at DESC;
