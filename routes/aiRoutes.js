/**
 * AI advisory (Express) — **separate** from the Python maintenance advisor.
 *
 * - Client sends the user’s problem description in `message`.
 * - Server returns a conversational `reply`, an `urgency` label, and a **disclaimer on every response**.
 * - Urgency is always one of: **Immediate** | **Within a Week** | **Monitor**.
 *
 * REQ-17–REQ-23 (partial): `sessionId` + short `history` for follow-up; wording varies by seed + turn count.
 */
const crypto = require("crypto");
const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const URGENCY = {
  IMMEDIATE: "Immediate",
  WITHIN_WEEK: "Within a Week",
  MONITOR: "Monitor",
};

const DISCLAIMER =
  "If symptoms are severe, sudden, or involve steering, brakes, smoke, or warning lights, stop driving and consult a certified professional immediately.";

/** Deterministic “pick one” so the same chat doesn’t jitter on retries, but different threads feel fresh. */
function variantIndex(seedStr, modulo) {
  const h = crypto.createHash("sha256").update(String(seedStr || "0"), "utf8").digest();
  return h.readUInt32BE(0) % Math.max(1, modulo);
}

function pickLine(seedStr, lines) {
  if (!lines.length) return "";
  return lines[variantIndex(seedStr, lines.length)];
}

function displayVehicleName(vc) {
  if (vc && typeof vc.name === "string" && vc.name.trim()) return vc.name.trim();
  return "";
}

function continuityLead(seedBase, historyLen) {
  if (historyLen < 2) return "";
  return pickLine(`${seedBase}|cont`, [
    "Thanks for the extra detail — ",
    "Good follow-up — ",
    "That helps — ",
    "Appreciate you adding more — ",
  ]);
}

function closingQuestion(seedBase, kind) {
  const pools = {
    safety: [
      "Are you noticing any pull to one side, pulsation in the pedal, or a burning smell?",
      "Does it get worse after the car sits, or only after you’ve been driving a while?",
    ],
    start: [
      "Does the cabin light dim when you try to crank, or is it totally silent?",
      "Did this start suddenly after a jump or new battery, or creep in over weeks?",
    ],
    heat: [
      "Is the temp gauge climbing in traffic but fine on the highway, or the opposite?",
      "Any sweet smell, steam from the hood, or coolant under the car?",
    ],
    maintenance: [
      "Roughly when was the last related service, if you remember?",
      "Any new noise or smell alongside this, or just the one symptom?",
    ],
    monitor: [
      "What would you say changed first — noise, feel, smell, or a warning light?",
      "Does it show up only on the first drive of the day, or every trip?",
    ],
  };
  const list = pools[kind] || pools.monitor;
  return pickLine(`${seedBase}|q`, list);
}

function detailBlock(seedBase, kind, name) {
  const pools = {
    safety: [
      `What I’d do next: avoid high-speed driving, keep extra following distance, and get a same-day inspection if possible. Likely causes include brake hydraulic issues, pad/rotor problems, or steering/suspension faults.`,
      `Practical next step: treat this as a safety concern and minimize driving until checked. Common roots are worn brake components, fluid/line issues, or front-end steering hardware wear.`,
    ],
    start: [
      `Useful checks before a visit: battery resting voltage, terminal corrosion, and whether the crank speed changed recently. Typical causes are weak battery capacity, charging faults, starter draw, or connection resistance.`,
      `To narrow it quickly, capture exactly what happens at key-on (single click, rapid clicks, slow crank, or crank-no-fire). That pattern usually separates battery/charging problems from starter or fuel/ignition issues.`,
    ],
    heat: [
      `What to watch right now: gauge trend, coolant smell, and any steam. Frequent causes are low coolant, thermostat or fan issues, water-pump flow loss, or leaks that only appear when hot.`,
      `Best immediate data for the shop: when temperature rises (idle vs highway), heater output, and visible coolant loss. That combination helps isolate fan, flow, and leak-related failures faster.`,
    ],
    maintenance: [
      `Reasoning: these issues are often manageable early, but delay increases wear and cost. A quick inspection now can prevent tire damage, oil-loss-related wear, or secondary failures.`,
      `Action plan: book service this week, continue short/normal driving only if symptoms stay mild, and escalate sooner if a warning light appears or handling/noise worsens.`,
    ],
    monitor: [
      `How to improve diagnosis quality: log when it happens, speed/RPM/load, outside temp, and any warning lights. Pattern-based notes usually cut guesswork and reduce unnecessary parts swapping.`,
      `If this stays stable, monitored driving is reasonable; if it becomes more frequent, louder, or starts affecting drivability, move it up to a scheduled diagnostic visit.`,
    ],
  };
  const list = pools[kind] || pools.monitor;
  return pickLine(`${seedBase}|detail|${name}`, list);
}

function extractEvidence(rawMessage) {
  const text = String(rawMessage || "");
  const msg = text.toLowerCase();
  const has = (re) => re.test(msg);

  const mileageMatches = [...msg.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:mi|miles)\b/g)];
  const mileMentions = mileageMatches
    .slice(0, 3)
    .map((m) => Number(String(m[1]).replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));

  const elapsedMatches = [
    ...msg.matchAll(
      /(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years|hour|hours)\b/g
    ),
  ];
  const elapsed = elapsedMatches.slice(0, 2).map((m) => `${m[1]} ${m[2]}`);

  const context = [];
  if (has(/\bcold start|when cold|cold\b/)) context.push("cold start");
  if (has(/\bhot|after warm(?:ing)? up|operating temp/)) context.push("after warm-up");
  if (has(/\bidle|at stop(?:light)?\b/)) context.push("at idle");
  if (has(/\bhighway|freeway|(\d{2,3})\s*(mph|km\/h)\b/)) context.push("at speed");
  if (has(/\bturn(?:ing)?|left turn|right turn\b/)) context.push("during turns");
  if (has(/\bbrak(?:e|ing)|pedal\b/)) context.push("during braking");
  if (has(/\baccelerat|throttle|under load|uphill\b/)) context.push("under acceleration/load");
  if (has(/\brain|wet|after rain\b/)) context.push("in wet conditions");

  const warnings = [];
  if (has(/\bcheck engine\b|\bmil\b/)) warnings.push("check-engine light");
  if (has(/\boil light|low oil\b/)) warnings.push("oil warning");
  if (has(/\bbattery light|charging light\b/)) warnings.push("battery/charging warning");
  if (has(/\babs\b|\bbrake warning\b/)) warnings.push("brake/ABS warning");
  if (has(/\btemp(?:erature)? warning|overheat\b/)) warnings.push("temperature warning");

  const severity = [];
  if (has(/\bworse|getting worse|progressive|more frequent\b/)) severity.push("progressive/worsening");
  if (has(/\bsudden|all of a sudden|abrupt\b/)) severity.push("sudden onset");
  if (has(/\bintermittent|sometimes|occasionally|comes and goes\b/)) severity.push("intermittent");
  if (has(/\bconstant|always|every time\b/)) severity.push("constant");
  if (has(/\bloud|severe|hard|violent\b/)) severity.push("high intensity");

  const symptomTags = [];
  if (has(/\bbrake|pedal|stopping distance|grind\b/)) symptomTags.push("brake");
  if (has(/\bsteer|pull|wander|alignment\b/)) symptomTags.push("steering");
  if (has(/\bsmoke|burning smell|fire\b/)) symptomTags.push("smoke/burn");
  if (has(/\boverheat|coolant|temperature\b/)) symptomTags.push("cooling");
  if (has(/\bstart|no crank|won't turn over|click\b/)) symptomTags.push("starting");
  if (has(/\bbattery|alternator|charging\b/)) symptomTags.push("electrical");
  if (has(/\boil|leak|pressure\b/)) symptomTags.push("oil/leak");
  if (has(/\btire|tyre|rotation|flat\b/)) symptomTags.push("tires");
  if (has(/\btransmission|shift|slip|gear\b/)) symptomTags.push("transmission");
  if (has(/\bnoise|sound|rattle|knock|squeak|grind\b/)) symptomTags.push("noise");
  if (has(/\bvibrat|shake|wobble\b/)) symptomTags.push("vibration");
  if (has(/\bhvac|a\/c|ac |heater|defrost|blower\b/)) symptomTags.push("hvac");

  return { mileMentions, elapsed, context, warnings, severity, symptomTags };
}

function extractedSummary(seedBase, evidence) {
  const facts = [];
  if (evidence.symptomTags.length) {
    facts.push(`symptoms: ${evidence.symptomTags.slice(0, 3).join(", ")}`);
  }
  if (evidence.context.length) {
    facts.push(`pattern: ${evidence.context.slice(0, 2).join(", ")}`);
  }
  if (evidence.warnings.length) {
    facts.push(`warnings: ${evidence.warnings.slice(0, 2).join(", ")}`);
  }
  if (evidence.elapsed.length) {
    facts.push(`duration: ${evidence.elapsed.join(" / ")}`);
  }
  if (evidence.mileMentions.length) {
    const list = evidence.mileMentions.slice(0, 2).map((m) => `${m} mi`);
    facts.push(`mileage refs: ${list.join(", ")}`);
  }
  if (evidence.severity.length) {
    facts.push(`severity cues: ${evidence.severity.slice(0, 2).join(", ")}`);
  }
  if (!facts.length) return "";
  const intro = pickLine(`${seedBase}|extractIntro`, [
    "From what you wrote, I’m extracting:",
    "I’m basing this on these details from your message:",
    "Here’s what I picked up from your text:",
  ]);
  return `${intro} ${facts.join(" | ")}.`;
}

function recentUserText(history, maxTurns = 6) {
  const hist = Array.isArray(history) ? history : [];
  const users = hist.filter((h) => h && h.role === "user" && typeof h.text === "string");
  return users
    .slice(-maxTurns)
    .map((u) => String(u.text).toLowerCase())
    .join(" ");
}

function buildReply(message, vehicleName, history) {
  const msg = message.toLowerCase();
  const hist = Array.isArray(history) ? history : [];
  const recentUser = recentUserText(hist);
  const contextMsg = `${recentUser} ${msg}`.trim();
  const seedBase = `${contextMsg}|${hist.length}|${vehicleName || ""}`;
  const name = vehicleName || "your vehicle";
  const lead = continuityLead(seedBase, hist.length);
  const followUpCue = /(more|follow|detail|what else|elaborate|another|also)/.test(msg);
  const evidence = extractEvidence(message);
  const evidenceLine = extractedSummary(seedBase, evidence);
  const inBrakeContext =
    /\bbrake|braking|pedal|grind|rotor|pad|pulsat/i.test(contextMsg) ||
    evidence.symptomTags.includes("brake");
  const inOilContext =
    /\boil|leak|filter|engine oil|oil change|low oil\b/i.test(contextMsg) ||
    evidence.symptomTags.includes("oil/leak");
  const inTireContext =
    /\btire|tyre|rotation|alignment|pressure|tread|flat\b/i.test(contextMsg) ||
    evidence.symptomTags.includes("tires");
  const inBatteryContext =
    /\bbattery|alternator|charging|jump start|no crank|click\b/i.test(contextMsg) ||
    evidence.symptomTags.includes("electrical") ||
    evidence.symptomTags.includes("starting");
  const inTransmissionContext =
    /\btransmission|shift|gear|slip|jerk|hard shift\b/i.test(contextMsg) ||
    evidence.symptomTags.includes("transmission");
  const inCoolingContext =
    /\bcoolant|overheat|temperature|radiator|fan\b/i.test(contextMsg) ||
    evidence.symptomTags.includes("cooling");
  const inAirFilterContext =
    /\bair filter|cabin filter|engine air filter|hvac filter|musty air\b/i.test(contextMsg);
  const inBrakeFluidContext = /\bbrake fluid|spongy pedal|soft pedal\b/i.test(contextMsg);
  const persistentCue = /\bevery trip|always|constant|each time|all the time/i.test(msg);
  const pulsationCue = /\bpulsat|pulsation|vibrat(e|ion)? in (the )?pedal/i.test(msg);

  const wrap = (body, urgency, kindForQuestion, options = {}) => {
    const { includePrompt = true, includeEvidence = true } = options;
    let out = lead + body;
    if (includeEvidence && evidenceLine) out += `\n\n${evidenceLine}`;
    out += `\n\n${detailBlock(seedBase, kindForQuestion, name)}`;
    if (includePrompt && followUpCue && hist.length > 0) {
      out +=
        "\n\nIf anything changed since your last message—new sound, new light, or it got worse—mention that next; it really helps narrow causes.";
    } else if (includePrompt) {
      out += `\n\n${closingQuestion(seedBase, kindForQuestion)}`;
    }
    return { reply: out.trim(), urgency };
  };

  // --- Short follow-up intents (avoid repeating the same generic line) ---
  if (
    hist.length > 0 &&
    /^(noise|sound|vibration|shake|smell|odor|feel|light|warning|braking|pulsation|oil|tires?|battery|coolant|overheating|transmission|shift|filter)$/i.test(
      msg.trim()
    )
  ) {
    const cue = msg.trim().toLowerCase();
    const focused =
      cue === "noise" || cue === "sound"
        ? "Got it — focusing on noise. Tell me location (front/rear/engine bay), trigger (braking/turning/speed), and whether it is worse warm vs cold."
        : cue === "vibration" || cue === "shake"
        ? "Understood — focusing on vibration. Tell me if it is in the steering wheel, seat/floor, or brake pedal, and the speed range where it starts."
        : cue === "smell" || cue === "odor"
        ? "Understood — focusing on smell. Tell me the smell type (burning/sweet/fuel/oily) and whether it appears after idling, braking, or longer drives."
        : cue === "light" || cue === "warning"
        ? "Understood — focusing on warning lights. Tell me which light, whether it is steady or flashing, and if drivability changed."
        : cue === "braking" || cue === "pulsation"
        ? "Understood — focusing on braking feel. Confirm whether pedal pulsation happens every stop, only at higher speeds, and whether stopping distance has changed."
        : cue === "oil"
        ? "Understood — focusing on oil-related symptoms. Tell me leak location, oil level trend, and whether the smell appears after longer/hot drives."
        : cue === "tire" || cue === "tires"
        ? "Understood — focusing on tires. Tell me wear pattern, pressure stability, and whether vibration/pull is speed-dependent."
        : cue === "battery"
        ? "Understood — focusing on battery/charging. Tell me whether it is no-crank, slow-crank, or starts after a jump."
        : cue === "coolant" || cue === "overheating"
        ? "Understood — focusing on cooling. Tell me gauge behavior (idle vs highway), coolant loss, and whether heater output changes."
        : cue === "transmission" || cue === "shift"
        ? "Understood — focusing on transmission behavior. Tell me which gears/speeds and whether shifts are delayed, harsh, or slipping."
        : cue === "filter"
        ? "Understood — focusing on filters. Tell me if this is engine performance airflow, cabin airflow, or odor-related."
        : "Understood — focusing on feel. Tell me whether the change is in steering, braking, acceleration, or idle.";
    const body =
      `${name}: ${focused}\n\n` +
      "Most useful next data: when it starts, how often it happens, and whether it is getting worse.";
    const contextUrgency =
      inBrakeContext || inBatteryContext || inCoolingContext || inTransmissionContext
        ? URGENCY.WITHIN_WEEK
        : URGENCY.MONITOR;
    const contextKind =
      inBrakeContext || inCoolingContext ? "safety" : inBatteryContext ? "start" : "monitor";
    return wrap(body, contextUrgency, contextKind, {
      includePrompt: false,
      includeEvidence: false,
    });
  }

  // --- General educational questions (not a specific live symptom report) ---
  if (
    /(check[-\s]?engine light).*(solid|steady).*(flash|flashing)/.test(msg) ||
    /(flash|flashing).*(check[-\s]?engine light).*(solid|steady)/.test(msg) ||
    /(what does it mean).*(check[-\s]?engine|mil).*(solid|steady|flashing|flash)/.test(msg)
  ) {
    const body =
      `${name}: quick rule of thumb — a **steady/solid check-engine light** usually means a non-immediate fault is stored (sensor/emissions/fuel-control issues are common), and you should schedule diagnosis soon.\n\n` +
      `A **flashing check-engine light** is treated as urgent because it often indicates an active misfire severe enough to damage the catalytic converter if you keep driving under load.\n\n` +
      `Practical response:\n` +
      `- Solid light: drive gently, avoid long delays, get codes scanned.\n` +
      `- Flashing light: reduce load immediately (no hard acceleration), and arrange prompt service; if the car runs rough, limit driving.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "monitor", {
      includePrompt: false,
      includeEvidence: false,
    });
  }

  if (
    /(what details should i track|what should i track).*(mechanic|shop|diagnos)/.test(msg) ||
    /before taking.*(mechanic|shop)/.test(msg)
  ) {
    const body =
      `${name}: best pre-visit notes are the ones that create a pattern, not just “it feels weird.”\n\n` +
      `Track these 6 items:\n` +
      `1) **When it happens** (cold start, idle, highway, braking, turns, uphill).\n` +
      `2) **Frequency/severity trend** (once/day vs every drive, getting worse or stable).\n` +
      `3) **Dash indicators** (which light, solid vs flashing, when it appears).\n` +
      `4) **Sound/feel specifics** (rattle, grind, vibration location, pedal feel, steering pull).\n` +
      `5) **Recent changes** (fuel stop, battery jump, tire/brake work, weather swing).\n` +
      `6) **Mileage/time context** (current mileage, and roughly when symptom started).`;
    return wrap(body, URGENCY.MONITOR, "monitor", {
      includePrompt: false,
      includeEvidence: false,
    });
  }

  if (/how do i describe.*(noise|sound).*(diagnos|mechanic|shop)/.test(msg)) {
    const body =
      `${name}: a mechanic can usually triage noise faster if you structure it like this:\n\n` +
      `**Noise profile**: type (squeal/grind/knock/rattle/hum), location (front-left, engine bay, rear), and loudness.\n` +
      `**Trigger**: speed-dependent, RPM-dependent, only over bumps, only while braking/turning.\n` +
      `**Conditions**: cold vs warm, dry vs wet, first drive vs all day.\n` +
      `**Change over time**: new, intermittent, or progressively worse.\n\n` +
      `Good one-line example: “Low grinding from front-right only while braking from 40–20 mph, louder when warm, started 2 weeks ago.”`;
    return wrap(body, URGENCY.MONITOR, "monitor", {
      includePrompt: false,
      includeEvidence: false,
    });
  }

  if (
    (contextMsg.includes("brake") || contextMsg.includes("braking") || evidence.symptomTags.includes("brake")) &&
    (msg.includes("grind") ||
      contextMsg.includes("grind") ||
      msg.includes("scrape") ||
      msg.includes("metal") ||
      msg.includes("squeal") ||
      msg.includes("screech") ||
      evidence.symptomTags.includes("noise"))
  ) {
    const body =
      `${name}: brake-related grinding/scraping is usually **not** a pure monitor item, even if pedal feel is still normal right now.\n\n` +
      `Most likely causes are pad wear at/near indicator metal, rotor surface issues, or debris contacting the rotor. Once grinding appears warm, damage risk and repair cost can increase quickly.\n\n` +
      `Practical plan:\n` +
      `- Treat this as **Within a Week** at minimum.\n` +
      `- Move to same-day if noise gets louder, braking distance changes, pedal pulsates, or any brake warning appears.\n` +
      `- Avoid hard braking and postpone long/high-speed trips until inspected.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "safety", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inBrakeContext && (pulsationCue || persistentCue || msg.includes("every trip"))) {
    const body =
      `${name}: pedal pulsation and “every trip” recurrence in a braking context usually means this is beyond a monitor-only scenario.\n\n` +
      `Likely causes include rotor thickness variation/runout, uneven pad transfer, or front-end braking hardware issues. Even with acceptable stopping now, the trend can worsen.\n\n` +
      `Recommended next step: treat as **Within a Week**, and move to same-day if braking distance increases, steering pull appears, or warning lights come on.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "safety", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inOilContext && (persistentCue || msg.includes("leak") || msg.includes("burning smell"))) {
    const body =
      `${name}: persistent oil/leak cues should be treated as **Within a Week**, not just monitor.\n\n` +
      `Likely causes include gasket seepage, filter sealing issues, or leak contact with hot surfaces. Early inspection helps prevent low-oil wear and higher repair costs.\n\n` +
      `Escalate to same-day if oil warning appears, visible smoke increases, or oil level drops quickly.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "maintenance", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inTireContext && (persistentCue || msg.includes("pull") || msg.includes("vibration"))) {
    const body =
      `${name}: recurring tire/handling cues are usually **Within a Week**.\n\n` +
      `Common causes include uneven wear, balance issues, pressure drift, or alignment drift. Waiting can accelerate tire wear and reduce braking/stability margins.\n\n` +
      `Escalate sooner if pull worsens, vibration becomes strong, or any TPMS warning appears.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "maintenance", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inBatteryContext && (persistentCue || msg.includes("no crank") || msg.includes("click"))) {
    const body =
      `${name}: repeated starting/charging symptoms are best treated as **Within a Week** at minimum.\n\n` +
      `Likely causes include battery reserve loss, high-resistance terminals, charging underperformance, or starter draw issues.\n\n` +
      `If no-crank becomes frequent or you need repeated jump starts, move to same-day service.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "start", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inTransmissionContext && (persistentCue || msg.includes("slip") || msg.includes("harsh"))) {
    const body =
      `${name}: recurring shift/slip behavior should be treated as **Within a Week**.\n\n` +
      `Transmission symptoms can progress quickly once fluid condition, pressure control, or clutch engagement becomes unstable.\n\n` +
      `Escalate sooner if shift shock worsens, drive engagement delays grow, or warning lights appear.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "maintenance", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inCoolingContext && (persistentCue || msg.includes("overheat") || msg.includes("temp"))) {
    const body =
      `${name}: cooling/temperature recurrence should be treated as urgent.\n\n` +
      `Overheat trends can escalate from manageable to engine-damaging quickly. Typical causes include coolant loss, thermostat/fan issues, or reduced circulation.\n\n` +
      `Treat as at least **Within a Week**, and move to same-day/immediate if gauge spikes or warning appears.`;
    return wrap(body, URGENCY.IMMEDIATE, "heat", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inAirFilterContext && (persistentCue || msg.includes("airflow") || msg.includes("musty"))) {
    const body =
      `${name}: persistent filter-related airflow/odor concerns are generally maintenance-priority, usually **Monitor** to **Within a Week** depending on severity.\n\n` +
      `Engine air-filter issues affect performance/efficiency; cabin filter issues affect airflow and odor quality.\n\n` +
      `If airflow is heavily restricted or odor worsens quickly, schedule service this week.`;
    return wrap(body, URGENCY.MONITOR, "maintenance", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  if (inBrakeFluidContext && (persistentCue || msg.includes("soft pedal") || msg.includes("spongy"))) {
    const body =
      `${name}: repeated soft/spongy pedal or brake-fluid concerns should be treated as safety-relevant.\n\n` +
      `Potential causes include fluid degradation/air in the system or hydraulic leaks, which can degrade braking consistency.\n\n` +
      `Plan same-week inspection and escalate immediately if pedal travel increases or stopping performance drops.`;
    return wrap(body, URGENCY.WITHIN_WEEK, "safety", {
      includePrompt: true,
      includeEvidence: true,
    });
  }

  // --- Safety / immediate ---
  if (
    msg.includes("brake") ||
    msg.includes("smoke") ||
    msg.includes("fire") ||
    msg.includes("steering") ||
    msg.includes("won't stop") ||
    msg.includes("cant stop") ||
    msg.includes("can't stop") ||
    evidence.warnings.includes("brake/ABS warning") ||
    (evidence.symptomTags.includes("brake") && evidence.severity.includes("high intensity"))
  ) {
    const body = pickLine(`${seedBase}|safe`, [
      `${name}: I’m treating this as higher urgency because brakes, steering, or smoke can turn serious fast. If anything feels unsafe, stop driving and get a professional involved.`,
      `With ${name}, what you’re describing sits in the “don’t ignore” bucket—especially if steering or braking feels off, or you see smoke. Safer to assume it needs prompt attention.`,
      `${name} — sounds like something I wouldn’t try to “wait out.” If braking or steering feels wrong, or there’s smoke, prioritize getting eyes on it before more miles.`,
    ]);
    return wrap(body, URGENCY.IMMEDIATE, "safety");
  }

  if (
    msg.includes("overheat") ||
    msg.includes("coolant") ||
    msg.includes("temperature") ||
    msg.includes("running hot") ||
    evidence.warnings.includes("temperature warning")
  ) {
    const body = pickLine(`${seedBase}|heat`, [
      `${name}: overheating can chew up an engine quickly. If the gauge is climbing, ease off, let it cool safely, and plan service—don’t keep pushing it if temps stay high.`,
      `On ${name}, hot-running issues are worth treating as urgent until you know why—cooling system problems often snowball if you keep driving while it’s pegged.`,
      `${name} — if you’re seeing heat or coolant concerns, I’d line up a shop visit soon and avoid hard driving until you know the cooling system is healthy.`,
    ]);
    return wrap(body, URGENCY.IMMEDIATE, "heat");
  }

  if (
    msg.includes("start") ||
    msg.includes("click") ||
    msg.includes("battery") ||
    msg.includes("won't turn over") ||
    msg.includes("cant turn over") ||
    msg.includes("no crank") ||
    msg.includes("cranks but") ||
    evidence.warnings.includes("battery/charging warning")
  ) {
    const body = pickLine(`${seedBase}|start`, [
      `${name}: no-start / clicking usually ends up being battery health, connections, starter draw, or charging—but the right fix depends a lot on what it sounds like when you turn the key.`,
      `For ${name}, a crank/no-start story often splits into “electrical delivery” vs “engine not firing.” Voltage tests and a quick listen to the starter behavior go a long way.`,
      `${name} — if it’s slow crank, rapid click, or total silence, each points a different direction. Either way, it’s worth getting tested soon so you’re not stranded.`,
    ]);
    return wrap(body, URGENCY.IMMEDIATE, "start");
  }

  // --- This week ---
  if (
    msg.includes("oil") ||
    msg.includes("leak") ||
    msg.includes("tire") ||
    msg.includes("tyre") ||
    msg.includes("rotation") ||
    msg.includes("pressure")
  ) {
    const body = pickLine(`${seedBase}|maint`, [
      `${name}: oil and tire items are the kind of “small now, expensive later” problems—worth a shop look this week if you’re seeing leaks, low oil, uneven wear, or pressure swings.`,
      `On ${name}, I’d still schedule something soon for oil level/leaks or tire wear—those systems forgive you for a bit, then they don’t.`,
      `${name} — for oil or tire concerns, I’d treat it as “plan a visit soon” even if the car feels fine; catching it early usually saves money.`,
    ]);
    return wrap(body, URGENCY.WITHIN_WEEK, "maintenance");
  }

  if (
    msg.includes("transmission") ||
    msg.includes("shift") ||
    msg.includes("slip") ||
    msg.includes("gear")
  ) {
    const body = pickLine(`${seedBase}|trans`, [
      `${name}: shifting weird or slipping is something I’d want diagnosed sooner than later—trans issues can degrade quickly once fluid or clutch packs start misbehaving.`,
      `For ${name}, if shifts are harsh, delayed, or you feel slip, it’s worth a professional scan and a road test—early intervention often beats a tow later.`,
      `${name} — transmission symptoms can be fluid, software, or hardware; either way, “wait and see” isn’t my favorite plan here.`,
    ]);
    return wrap(body, URGENCY.WITHIN_WEEK, "maintenance");
  }

  // --- Monitor / triage ---
  if (
    msg.includes("check engine") ||
    msg.includes("mil") ||
    msg.includes("warning light") ||
    msg.includes("light on dash")
  ) {
    const body = pickLine(`${seedBase}|light`, [
      `${name}: a dash light is your car asking for data—note whether it flashes vs stays solid, and whether performance changed. If it’s flashing under load, treat that more seriously.`,
      `On ${name}, warning lights are easiest to interpret with a code readout, but even without one: flashing MIL + misfire feel is different from a steady light with no driveability change.`,
      `${name} — if a light just appeared, I’d jot when it happens (cold start, cruise, after fueling) and whether power or idle changed—that story speeds up diagnosis.`,
    ]);
    return wrap(body, URGENCY.MONITOR, "monitor");
  }

  if (
    msg.includes("noise") ||
    msg.includes("sound") ||
    msg.includes("squeak") ||
    msg.includes("rattle") ||
    msg.includes("knock") ||
    msg.includes("grind")
  ) {
    const body = pickLine(`${seedBase}|noise`, [
      `${name}: noises are all about *when* and *where from*—wheel area vs engine bay vs cabin changes the suspect list a lot.`,
      `For ${name}, try to describe the noise like a mechanic would: speed-dependent? only turning? worse cold? That single sentence often cuts the possibilities in half.`,
      `${name} — intermittent sounds are annoying but common; pairing them with speed/RPM/brake/turn usually separates “normal wear” from “needs attention soon.”`,
    ]);
    return wrap(body, URGENCY.MONITOR, "monitor");
  }

  if (
    msg.includes("vibrat") ||
    msg.includes("shake") ||
    msg.includes("wobble")
  ) {
    const body = pickLine(`${seedBase}|vib`, [
      `${name}: vibration can be tires/wheels, mounts, or driveline—speed-specific wobble vs steering-wheel shake at certain speeds points different directions.`,
      `On ${name}, if it’s seat-of-pants shake vs steering wheel buzz, mention that next; it changes the short list quite a bit.`,
      `${name} — if it started right after a tire service or curb hit, say so—that context matters a lot for vibration work.`,
    ]);
    return wrap(body, URGENCY.MONITOR, "monitor");
  }

  if (msg.includes("smell") || msg.includes("odor")) {
    const body = pickLine(`${seedBase}|smell`, [
      `${name}: smells matter—sweet usually suggests coolant, acrid/oily can be leaks hitting hot parts, burnt can be belts or brakes. If you smell fuel strongly, be extra cautious.`,
      `For ${name}, note whether the smell comes with heat/AC on, after braking, or only at idle; those patterns narrow it down fast.`,
      `${name} — if a smell started suddenly with smoke or temp rise, that’s a different conversation than a faint odor you only notice parked.`,
    ]);
    return wrap(body, URGENCY.MONITOR, "monitor");
  }

  if (
    msg.includes("hvac") ||
    msg.includes("air conditioning") ||
    msg.includes(" a/c") ||
    msg.includes(" ac ") ||
    msg.includes("ac not") ||
    msg.includes("heater") ||
    msg.includes("defrost") ||
    msg.includes("blower fan")
  ) {
    const body = pickLine(`${seedBase}|hvac`, [
      `${name}: HVAC complaints often split into “blower/airflow” vs “temperature”—knowing which helps a lot.`,
      `On ${name}, if it’s weak airflow on all speeds, that’s a different track than “cold only on one side.”`,
      `${name} — for cabin temp issues, mention whether the compressor clutch clicks on and if the lines feel cold—those clues help without opening the hood.`,
    ]);
    return wrap(body, URGENCY.MONITOR, "monitor");
  }

  const snippet = String(message).trim();
  const echo =
    snippet.length > 24
      ? pickLine(`${seedBase}|echo`, [
          "Thanks for sharing that — ",
          "Got it, that helps — ",
          "Understood — ",
        ])
      : "";

  const body = pickLine(`${seedBase}|gen`, [
    `${echo}${name}: I don’t have enough specifics yet to pin a single cause, but you’re not wrong to pay attention. Keep notes on when it happens (cold start, highway, braking) and any lights.`,
    `${echo}For ${name}, the next useful step is usually turning vague symptoms into patterns—when, how often, and what changed recently (fuel, tires, weather, repairs).`,
    `${echo}${name} — if nothing screams “stop driving now,” monitoring is reasonable, as long as you’re ready to escalate if it worsens or new lights appear.`,
  ]);

  return wrap(body, URGENCY.MONITOR, "monitor");
}

function normalizeUrgency(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "immediate" || s === "urgent" || s === "now") return URGENCY.IMMEDIATE;
  if (s === "within a week" || s === "soon" || s === "this week") return URGENCY.WITHIN_WEEK;
  return URGENCY.MONITOR;
}

function tryParseClaudeJson(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

async function callClaudeChat({ message, vehicleName, history }) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  if (typeof fetch !== "function") return null;

  const configuredModel = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
  const hist = Array.isArray(history) ? history : [];
  const normalizedHistory = hist
    .slice(-16)
    .map((h) => ({
      role: h?.role === "ai" ? "assistant" : "user",
      content: [{ type: "text", text: String(h?.text || "").trim() }],
    }))
    .filter((h) => h.content?.[0]?.text);

  const system = [
    "You are an automotive triage assistant agent for a maintenance app.",
    "Use tools when useful to inspect extracted cues before deciding urgency.",
    "Write in a natural, conversational tone like a helpful service advisor.",
    "Acknowledge the user's concern briefly, then give direct guidance.",
    "Avoid robotic template phrasing and avoid repeating the same sentence patterns.",
    "Return valid JSON only with keys: reply, urgency, suggestions.",
    "urgency must be one of: Immediate, Within a Week, Monitor.",
    "Do not include markdown code fences.",
    "Do not include the legal disclaimer in reply (server adds it).",
    "If severity is unclear, ask one focused follow-up question in reply.",
    "Keep reply to 1-3 short paragraphs and at most one focused question.",
  ].join(" ");

  const userPrompt = `Vehicle: ${vehicleName || "Unknown vehicle"}\nUser message: ${String(
    message || ""
  ).trim()}\nRespond in JSON: {"reply":"...","urgency":"Immediate|Within a Week|Monitor","suggestions":["optional follow-up 1","optional follow-up 2"]}`;

  const tools = [
    {
      name: "get_message_context",
      description:
        "Get extracted symptom/context cues from current user message and recent user turns.",
      input_schema: {
        type: "object",
        properties: {
          include_recent_history: { type: "boolean" },
        },
        required: [],
      },
    },
    {
      name: "get_urgency_hint",
      description:
        "Get deterministic urgency hint from extracted cues (safety/warning/worsening patterns).",
      input_schema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ];

  const buildToolResult = (toolName, input) => {
    const recent = recentUserText(hist, 6);
    const joined = `${recent} ${String(message || "")}`.trim();
    const ev = extractEvidence(joined);
    if (toolName === "get_message_context") {
      return {
        vehicle: vehicleName || "Unknown vehicle",
        message: String(message || "").trim(),
        include_recent_history: !!input?.include_recent_history,
        extracted: ev,
        recent_user_text: input?.include_recent_history ? recent : "",
      };
    }
    if (toolName === "get_urgency_hint") {
      const severeSafety =
        ev.warnings.includes("brake/ABS warning") ||
        ev.warnings.includes("temperature warning") ||
        ev.symptomTags.includes("smoke/burn");
      const thisWeek =
        ev.symptomTags.includes("brake") ||
        ev.symptomTags.includes("cooling") ||
        ev.symptomTags.includes("transmission") ||
        ev.severity.includes("progressive/worsening");
      return {
        urgency_hint: severeSafety
          ? URGENCY.IMMEDIATE
          : thisWeek
            ? URGENCY.WITHIN_WEEK
            : URGENCY.MONITOR,
        rationale: {
          warnings: ev.warnings,
          severity: ev.severity,
          symptoms: ev.symptomTags,
        },
      };
    }
    return { error: "unknown_tool" };
  };

  const doMessageCall = async (model) => {
    const messages = [...normalizedHistory, { role: "user", content: [{ type: "text", text: userPrompt }] }];
    let turns = 0;
    while (turns < 6) {
      turns += 1;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 650,
          temperature: 0.6,
          system,
          tools,
          tool_choice: { type: "auto" },
          messages,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const e = new Error(`claude_http_${res.status}:${errText.slice(0, 240)}`);
        e.status = res.status;
        e.body = errText;
        throw e;
      }
      const data = await res.json();
      const content = Array.isArray(data?.content) ? data.content : [];
      const toolUses = content.filter((c) => c?.type === "tool_use");
      messages.push({ role: "assistant", content });
      if (!toolUses.length) {
        return data;
      }
      const toolResults = toolUses.map((toolUse) => {
        const out = buildToolResult(toolUse.name, toolUse.input || {});
        return {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(out),
        };
      });
      messages.push({ role: "user", content: toolResults });
    }
    throw new Error("claude_agent_loop_exceeded");
  };

  const pickFallbackModel = async () => {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const ids = Array.isArray(body?.data) ? body.data.map((m) => String(m.id || "")) : [];
    if (!ids.length) return null;
    return (
      ids.find((id) => id.startsWith("claude-sonnet")) ||
      ids.find((id) => id.startsWith("claude-haiku")) ||
      ids[0]
    );
  };

  let data;
  try {
    data = await doMessageCall(configuredModel);
  } catch (e) {
    const isModelNotFound =
      e?.status === 404 && /not_found_error|model/i.test(String(e?.body || e?.message || ""));
    if (!isModelNotFound) throw e;
    const fallbackModel = await pickFallbackModel();
    if (!fallbackModel || fallbackModel === configuredModel) throw e;
    data = await doMessageCall(fallbackModel);
  }

  const text = Array.isArray(data?.content)
    ? data.content
        .filter((c) => c?.type === "text")
        .map((c) => String(c.text || ""))
        .join("\n")
    : "";
  const parsed = tryParseClaudeJson(text);
  if (!parsed || typeof parsed.reply !== "string") {
    return {
      reply: text.trim() || "I could not parse model output. Please try again.",
      urgency: URGENCY.MONITOR,
      suggestions: [],
    };
  }
  return {
    reply: parsed.reply.trim(),
    urgency: normalizeUrgency(parsed.urgency),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s) => String(s)).slice(0, 3)
      : [],
  };
}

router.post("/chat", authMiddleware, async (req, res) => {
  const { message, vehicleContext, sessionId, history } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  const vc =
    vehicleContext && typeof vehicleContext === "object" ? vehicleContext : {};
  const vehicleName = displayVehicleName(vc);

  const hist = Array.isArray(history) ? history : [];
  let result = null;
  try {
    result = await callClaudeChat({ message, vehicleName, history: hist });
  } catch {
    result = null;
  }
  const fallback = buildReply(message, vehicleName, hist);
  const reply = result?.reply || fallback.reply;
  const urgency = result?.urgency || fallback.urgency;
  const suggestions = Array.isArray(result?.suggestions) ? result.suggestions : [];

  const sid =
    typeof sessionId === "string" && sessionId.trim()
      ? sessionId.trim()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  res.json({
    reply,
    urgency,
    disclaimer: DISCLAIMER,
    forUser: req.user.email,
    sessionId: sid,
    suggestions,
  });
});

module.exports = router;
