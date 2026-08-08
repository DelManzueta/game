import type { GenreId } from "../types";
import { MEDIA_TOPICS, TRADE_SHOWS, tradeShowKey } from "./externalFactors";

/**
 * Industry story arcs — scripted world events (not random filler).
 * Original Studio Empire fiction; not a port of any real-world studio.
 *
 * Calendar anchors assume START_YEAR 1982:
 *  - Campaign year index 19 → calendar 2001 (brand rights)
 *  - Campaign year index 25 → calendar 2007 (first SAGA hardware)
 */

export type StoryChoiceDef = {
  label: string;
  effect: string;
  cash?: number;
  rp?: number;
  hype?: number;
  fans?: number;
  /** Temporary marketing multiplier until week+duration */
  marketingMult?: number;
  marketingWeeks?: number;
  /** Genre trend lifts applied immediately */
  genreLifts?: Partial<Record<GenreId, number>>;
  /** Unlock topic ids */
  unlockTopics?: string[];
  /** Book creator id for next release buff */
  bookCreator?: string;
};

export type IndustryStoryBeat = {
  id: string;
  arc: "saga" | "playsystem_origin" | "industry" | "trade_show" | "media" | "creator";
  year: number;
  month: number;
  title: string;
  body: string;
  choices: StoryChoiceDef[];
  announcePlatforms?: string[];
  launchPlatforms?: string[];
  boostPlatforms?: { id: string; marketSizeBase?: number; momentum?: number; brandStrength?: number }[];
  newsHeadline?: string;
  newsBody?: string;
  /** Recurring trade show — id is unique per year via tradeShowKey */
  recurring?: boolean;
};

export const SAGA_STORY: IndustryStoryBeat[] = [
  {
    id: "saga_rights_deal",
    arc: "saga",
    year: 2001,
    month: 3,
    title: "Industry wire: SAGA rights change hands",
    body:
      "Trade rags report that Helix Interactive — a 40-person arcade-tools shop in Yokohama — has acquired the dormant SAGA trademark and catalog rights from a holding company. " +
      "No hardware is promised yet. Analysts call it a nostalgia play; Helix’s founders call it “unfinished business.”",
    choices: [
      { label: "File the clipping", effect: "Note the brand for later", hype: 1 },
      { label: "Scout Helix talent quietly", effect: "+RP, small cost", cash: -2500, rp: 4 },
      { label: "Issue a friendly press quote", effect: "+hype, tiny fans", hype: 5, fans: 40 },
    ],
    newsHeadline: "Helix Interactive acquires SAGA rights",
    newsBody: "A small startup buys a legendary name. Hardware rumors begin immediately.",
  },
  {
    id: "saga_console_tease",
    arc: "saga",
    year: 2005,
    month: 6,
    title: "SAGA hardware project confirmed",
    body:
      "Helix stages a closed-door briefing: the first SAGA living-room system is in silicon bring-up, targeting a 2007 window. " +
      "Codename “Nova.” Early kits are crude, but third-party outreach has already started.",
    choices: [
      { label: "Request early SDK access", effect: "Reserve interest · +RP", rp: 6, cash: -4000 },
      { label: "Watch and wait", effect: "No commitment" },
      { label: "Bet on them publicly", effect: "+hype if they ship", hype: 8, cash: -1500 },
    ],
    announcePlatforms: ["saga_nova"],
    newsHeadline: "SAGA Nova console targeted for 2007",
    newsBody: "Helix confirms first-party hardware under the revived SAGA brand.",
  },
  {
    id: "saga_nova_launch",
    arc: "saga",
    year: 2007,
    month: 9,
    title: "SAGA Nova launches",
    body:
      "SAGA Nova hits retail with a lean first-party slate and aggressive third-party incentives. " +
      "Helix announces a long-horizon roadmap: three hardware generations, not a one-and-done reboot.",
    choices: [
      { label: "License Nova development", effect: "Unlock platform path", cash: -18000, hype: 6 },
      { label: "Study the architecture", effect: "+RP", rp: 8 },
      { label: "Ignore the launch window", effect: "Stay on current platforms" },
    ],
    launchPlatforms: ["saga_nova"],
    boostPlatforms: [{ id: "saga_nova", marketSizeBase: 0.55, momentum: 1.05, brandStrength: 0.45 }],
    newsHeadline: "SAGA Nova is live",
    newsBody: "Helix’s first SAGA console begins a slow climb for market share.",
  },
  {
    id: "saga_share_rise_1",
    arc: "saga",
    year: 2010,
    month: 4,
    title: "SAGA share creeps upward",
    body:
      "Hardware trackers put SAGA Nova past the “hobbyist” threshold. Helix is already demoing a successor board at trade shows.",
    choices: [
      { label: "Commission a market brief", effect: "+RP, −cash", cash: -3000, rp: 5 },
      { label: "Cheer from the sidelines", effect: "+hype", hype: 4 },
    ],
    boostPlatforms: [{ id: "saga_nova", marketSizeBase: 0.75, momentum: 1.12, brandStrength: 0.55 }],
    newsHeadline: "SAGA Nova crosses 8% living-room share in key regions",
    newsBody: "Still third or fourth, but no longer a footnote.",
  },
  {
    id: "saga_blitz_launch",
    arc: "saga",
    year: 2013,
    month: 11,
    title: "SAGA Blitz — generation two",
    body:
      "SAGA Blitz launches with a hybrid online service and a clearer identity: fast competitive multiplayer and stylish action.",
    choices: [
      { label: "Commit a multiplayer title", effect: "License interest · +hype", cash: -22000, hype: 10, rp: 3 },
      { label: "Port an older hit later", effect: "Soft commitment", hype: 3 },
      { label: "Stay multi-platform elsewhere", effect: "No change" },
    ],
    launchPlatforms: ["saga_blitz"],
    announcePlatforms: ["saga_blitz"],
    boostPlatforms: [
      { id: "saga_nova", marketSizeBase: 0.5, momentum: 0.85 },
      { id: "saga_blitz", marketSizeBase: 0.95, momentum: 1.15, brandStrength: 0.62 },
    ],
    newsHeadline: "SAGA Blitz opens the second act",
    newsBody: "Helix’s three-tier plan is no longer vaporware.",
  },
  {
    id: "saga_share_rise_2",
    arc: "saga",
    year: 2016,
    month: 8,
    title: "SAGA sits at the table",
    body:
      "By mid-decade SAGA hardware holds a real slice of the living-room pie. Helix teases “Apex,” the third generation.",
    choices: [
      { label: "Open a SAGA-focused pod", effect: "+fans, −cash, +RP", cash: -12000, fans: 400, rp: 6 },
      { label: "Keep a watching brief", effect: "+hype", hype: 3 },
    ],
    boostPlatforms: [{ id: "saga_blitz", marketSizeBase: 1.1, momentum: 1.18, brandStrength: 0.72 }],
    newsHeadline: "SAGA combined share approaches mid-teens in tracked markets",
    newsBody: "The reboot is now a structural competitor.",
  },
  {
    id: "saga_apex_launch",
    arc: "saga",
    year: 2019,
    month: 10,
    title: "SAGA Apex completes the trilogy",
    body:
      "SAGA Apex launches as Helix’s third major living-room system — the capstone of the plan sketched when they bought the name.",
    choices: [
      { label: "License Apex day-one", effect: "Full access path", cash: -35000, hype: 12 },
      { label: "Wait for install base", effect: "+RP", rp: 5 },
      { label: "Double down on PC + other consoles", effect: "Focus elsewhere", hype: 2 },
    ],
    launchPlatforms: ["saga_apex"],
    boostPlatforms: [
      { id: "saga_blitz", marketSizeBase: 0.7, momentum: 0.9 },
      { id: "saga_apex", marketSizeBase: 1.25, momentum: 1.2, brandStrength: 0.8 },
    ],
    newsHeadline: "SAGA Apex ships — three-tier roadmap fulfilled",
    newsBody: "Helix’s long game from a trademark purchase to a full console house pays off.",
  },
  {
    id: "saga_mature_share",
    arc: "saga",
    year: 2022,
    month: 5,
    title: "SAGA holds the bronze seat",
    body:
      "Industry audits put SAGA near a stable fifth of young-adult living-room hours in several regions. " +
      "Your studio’s history with them is now a strategic choice, not trivia.",
    choices: [
      { label: "Deepen the relationship", effect: "+hype, +fans", hype: 8, fans: 600 },
      { label: "Stay platform-agnostic", effect: "Balanced stance", rp: 3 },
    ],
    boostPlatforms: [{ id: "saga_apex", marketSizeBase: 1.35, momentum: 1.15, brandStrength: 0.85 }],
    newsHeadline: "SAGA cements long-term #3 hardware position",
    newsBody: "From trademark lot to permanent competitor.",
  },
];

export const PLAYSYSTEM_ORIGIN: IndustryStoryBeat[] = [
  {
    id: "playsystem_chip_talks",
    arc: "playsystem_origin",
    year: 1989,
    month: 10,
    title: "Chip talks break down",
    body:
      "Rumors swirl that Vena’s optical-media group and the TES hardware team have abandoned a joint next-gen box. " +
      "Vena’s engineers are quietly spinning their half of the design into a standalone machine.",
    choices: [
      { label: "Track the spin-out", effect: "Note for later", rp: 2 },
      { label: "Ignore industry gossip", effect: "Focus on shipping" },
    ],
    newsHeadline: "Vena–TES collaboration reportedly collapses",
    newsBody: "A new living-room architecture may emerge from the wreckage.",
  },
  {
    id: "playsystem_announce",
    arc: "playsystem_origin",
    year: 1994,
    month: 5,
    title: "Vena unveils the Playsystem",
    body:
      "What began as a failed joint project is now Vena’s flagship: the Playsystem. Optical discs and 3D-first marketing rewrite mid-90s expectations.",
    choices: [
      { label: "Queue for a dev kit", effect: "−cash, +hype", cash: -12000, hype: 10 },
      { label: "Stay on current hardware", effect: "Caution", rp: 2 },
    ],
    newsHeadline: "Playsystem announced",
    newsBody: "Vena enters the living room under its own banner.",
  },
];

/** Media partnership unlocks (licensed-topic fantasy). */
export const MEDIA_STORY: IndustryStoryBeat[] = MEDIA_TOPICS.map((m) => ({
  id: `media_unlock_${m.id}`,
  arc: "media" as const,
  year: m.unlockYear,
  month: 4,
  title: `License offer: ${m.name.replace(" ★", "")}`,
  body:
    `A streaming & film house offers a limited interactive license for “${m.name.replace(" ★", "")}.” ` +
    `${m.blurb} ` +
    `Taking the deal unlocks a special topic for your studio — higher fan upside, higher expectations.`,
  choices: [
    {
      label: "Sign the license",
      effect: "Unlock media topic · cost",
      cash: -25000,
      hype: 12,
      unlockTopics: [m.id],
      fans: 200,
    },
    {
      label: "Pass for now",
      effect: "Keep cash; topic stays locked",
      rp: 2,
    },
  ],
  newsHeadline: `Studios circle “${m.name.replace(" ★", "")}” interactive rights`,
  newsBody: "Licensed topics enter the industry conversation.",
}));

/** Creator ecosystem unlock + sample booking events. */
export const CREATOR_STORY: IndustryStoryBeat[] = [
  {
    id: "creators_arrive",
    arc: "creator",
    year: 2008,
    month: 9,
    title: "Creators change discovery",
    body:
      "Long-form video hosts and live streamers are driving more awareness than print ads for mid-size titles. " +
      "Agencies start offering “creator packages” — pay a host to feature your game during launch week.",
    choices: [
      {
        label: "Open a creator budget line",
        effect: "Unlock creator marketing · −cash",
        cash: -5000,
        hype: 6,
        marketingMult: 1.08,
        marketingWeeks: 24,
      },
      { label: "Stick to magazines & TV", effect: "Traditional path", rp: 2 },
    ],
    newsHeadline: "Creator marketing goes mainstream",
    newsBody: "Studios experiment with streamer-led launches.",
  },
  {
    id: "creator_pitch_upset",
    arc: "creator",
    year: 2012,
    month: 2,
    title: "The Upset Game Geek wants a code",
    body:
      "A popular host with a soft spot for fantasy RPGs offers an early look. " +
      "A good fit can spike awareness; a mismatch becomes meme fodder.",
    choices: [
      {
        label: "Send a code + gift pack",
        effect: "Book Upset Geek · cost",
        cash: -10000,
        hype: 8,
        bookCreator: "upset_geek",
        marketingMult: 1.1,
        marketingWeeks: 8,
      },
      { label: "Decline politely", effect: "No change" },
    ],
  },
  {
    id: "creator_pitch_cyber",
    arc: "creator",
    year: 2015,
    month: 7,
    title: "CyberVsOpp open for collabs",
    body:
      "A high-energy action streamer is booking launch-week co-streams. Superhero and cyberpunk titles do best on their channel.",
    choices: [
      {
        label: "Book a co-stream",
        effect: "Creator package",
        cash: -12000,
        hype: 10,
        bookCreator: "cybervopp",
        marketingMult: 1.12,
        marketingWeeks: 6,
        fans: 100,
      },
      { label: "Pass", effect: "Save budget" },
    ],
  },
];

function tradeShowBeats(): IndustryStoryBeat[] {
  // Expand G3 for key years (every year would spam; every 2 years + early/late samples)
  const beats: IndustryStoryBeat[] = [];
  for (let y = 1985; y <= 2028; y += 1) {
    // Annual G3 in June
    beats.push({
      id: tradeShowKey("g3_expo", y),
      arc: "trade_show",
      year: y,
      month: 6,
      recurring: true,
      title: `G3 Expo ${y}`,
      body:
        `The Global Game Gathering floor is open. Fans, press, and platform holders walk the halls. ` +
        `Booth size signals ambition — empty huge booths hurt more than a tight indie corner helps.`,
      choices: [
        {
          label: "Indie corner booth",
          effect: "Cheap awareness · mild marketing buff",
          cash: -Math.round(2000 + (y - 1985) * 180),
          hype: 6,
          marketingMult: 1.08,
          marketingWeeks: 10,
          genreLifts: { action: 0.02, casual: 0.015 },
        },
        {
          label: "Mid floor booth",
          effect: "Solid presence · stronger buff",
          cash: -Math.round(8000 + (y - 1985) * 450),
          hype: 12,
          marketingMult: 1.14,
          marketingWeeks: 12,
          fans: 80,
          genreLifts: { action: 0.03, adventure: 0.02, rpg: 0.02 },
        },
        {
          label: "Premium pavilion",
          effect: "Big spend · max post-show push",
          cash: -Math.round(25000 + (y - 1985) * 900),
          hype: 20,
          marketingMult: 1.22,
          marketingWeeks: 14,
          fans: 200,
          rp: 3,
          genreLifts: { action: 0.04, adventure: 0.03, rpg: 0.03, casual: 0.02 },
        },
        {
          label: "Skip G3 this year",
          effect: "Save cash · no buff",
        },
      ],
      newsHeadline: `G3 ${y} opens`,
      newsBody: "Studios fight for floor mindshare.",
    });
  }
  // Winter showcase every other year from 1998
  for (let y = 1998; y <= 2028; y += 2) {
    beats.push({
      id: tradeShowKey("winter_showcase", y),
      arc: "trade_show",
      year: y,
      month: 1,
      recurring: true,
      title: `Winter Digital Showcase ${y}`,
      body:
        "Trailer slots and algorithm boosts are for sale. A strong clip can lift hype before spring releases.",
      choices: [
        {
          label: "Buy a featured slot",
          effect: "Marketing buff · cost",
          cash: -Math.round(5000 + (y - 1998) * 400),
          hype: 10,
          marketingMult: 1.1,
          marketingWeeks: 8,
        },
        {
          label: "Community trailer only",
          effect: "Cheap buzz",
          cash: -800,
          hype: 4,
          marketingMult: 1.04,
          marketingWeeks: 5,
        },
        { label: "Skip", effect: "No spend" },
      ],
    });
  }
  return beats;
}

export const INDUSTRY_STORY_BEATS: IndustryStoryBeat[] = [
  ...PLAYSYSTEM_ORIGIN,
  ...SAGA_STORY,
  ...MEDIA_STORY,
  ...CREATOR_STORY,
  ...tradeShowBeats(),
];

export function storyBeatsForDate(year: number, month: number): IndustryStoryBeat[] {
  return INDUSTRY_STORY_BEATS.filter((b) => b.year === year && b.month === month);
}

export function getStoryBeat(id: string): IndustryStoryBeat | undefined {
  return INDUSTRY_STORY_BEATS.find((b) => b.id === id);
}

// re-export for convenience
export { TRADE_SHOWS, MEDIA_TOPICS };
