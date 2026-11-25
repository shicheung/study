#!/usr/bin/env node
/**
 * Build plan-data.js from p3-year-plan.md — never substitute the word "window".
 */
import { readFileSync, writeFileSync } from "fs";

const PLAN_PATH = "/cursor/stores/self/internal/p3-year-plan.md";
const md = readFileSync(PLAN_PATH, "utf8");

function cleanExample(raw) {
  return raw.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\\"/g, '"').trim();
}

function cleanBoldPhrase(raw) {
  return raw.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
}

const learnGuide = {
  en: "Read the word aloud, check the Chinese meaning, compare it with the basic word it replaces, and read the example sentence. Then try making one spoken or written sentence of your own.",
  zh: "大聲讀出詞語，看看中文意思，和它可以替代的基礎詞比較，讀例句，然後試造一句（口說或書寫都可以）。",
};

const learnGuideSat = {
  en: "Cover the English column and test yourself using the Chinese translations, or play a quick matching/acting game with a parent.",
  zh: "遮住英文欄，用中文自測，或跟家長玩配對／表演小遊戲。",
};

const learnGuideSun = {
  en: "Write a short paragraph (3–5 sentences) using at least 3 of the week's words/phrases based on the weekly prompt.",
  zh: "按本週提示，用最少 3 個本週詞語寫一段 3–5 句英文。",
};

const weeks = [];
let week = 0;
let weekTitle = "";
let weekWords = [];

const rowLearn =
  /^\| (Mon|Tue|Wed|Thu|Fri) \| \*\*([^|]+)\*\*(?: \(([^)]+)\))? \| ([^|]+) \| ([^|]+) \| (.+) \|$/;

for (const line of md.split("\n")) {
  const wh = line.match(/^### Week (\d+): (.+)/);
  if (wh) {
    week = parseInt(wh[1], 10);
    weekTitle = wh[2].trim();
    weekWords = [];
    continue;
  }

  const rm = line.match(rowLearn);
  if (rm) {
    const [, weekday, rawTitle, pos, meaning, col4, exampleRaw] = rm;
    const title = cleanBoldPhrase(rawTitle);
    weekWords.push(title);
    const entry = {
      weekday,
      title,
      pos: (pos || "").trim(),
      meaning: meaning.trim(),
      example: cleanExample(exampleRaw),
    };
    if (week === 50) entry.usage = col4.trim();
    else entry.upgradeFrom = col4.trim();
    if (!weeks[week - 1] || weeks[week - 1].week !== week) {
      weeks.push({ week, weekTitle, learn: [], review: null, writing: null });
    }
    weeks[week - 1].learn.push(entry);
    continue;
  }

  const sat = line.match(/^\* \*\*Sat \(Review\):\*\* (.+)/);
  if (sat && week > 0) {
    weeks[week - 1].review = {
      task: sat[1].trim(),
      weekWords: weekWords.slice(),
    };
    continue;
  }
  const satYear = line.match(/^\* \*\*Sat \(Year-End Celebration Review — Day 364\):\*\* (.+)/);
  if (satYear) {
    weeks[week - 1].review = {
      task: satYear[1].trim(),
      weekWords: weekWords.slice(),
      yearEnd: true,
    };
    continue;
  }

  const sun = line.match(/^\* \*\*Sun \(Mini Writing\):\*\* (.+)/);
  if (sun && week > 0) {
    weeks[week - 1].writing = { task: sun[1].trim(), weekWords: weekWords.slice() };
    continue;
  }
  const sunYear = line.match(/^\* \*\*Sun \(Day 365 Graduation Story\):\*\* (.+)/);
  if (sunYear) {
    weeks[week - 1].writing = {
      task: sunYear[1].trim(),
      weekWords: weekWords.slice(),
      graduation: true,
    };
  }
}

const payload = {
  learnGuide,
  learnGuideSat,
  learnGuideSun,
  weeks,
};

const out =
  "/* Auto-generated from p3-year-plan.md — do not run string replace on \"window\". */\n" +
  "(function (g) {\n  g.P3_YEAR_PLAN = " +
  JSON.stringify(payload, null, 0) +
  ";\n})(typeof globalThis !== \"undefined\" ? globalThis : window);\n";

writeFileSync(new URL("./plan-data.js", import.meta.url), out, "utf8");
console.log("Weeks:", weeks.length, "learn rows:", weeks.reduce((n, w) => n + w.learn.length, 0));