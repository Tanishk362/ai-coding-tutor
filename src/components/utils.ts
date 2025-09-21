export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// Detect if text likely contains a math problem or a question suited for step-by-step help.
// Heuristics:
// - LaTeX markers: $, $$, \\[, \\], \\(, \\)
// - Common math keywords: solve, find, compute, simplify, derivative, integral, matrix, determinant, eigen, evaluate, factor, polynomial, equation, system, limit, probability, statistics
// - Presence of inline math operators combined with digits: e.g., x^2, 2x+3=5
// - Ends with a question mark or starts with interrogatives
export function containsMathOrQuestion(raw?: string): boolean {
  if (!raw) return false;
  const text = raw.toLowerCase();
  // quick question heuristics
  if (/[?]\s*$/.test(text)) return true;
  if (/\b(why|how|what|when|where|which|who)\b/.test(text)) return true;

  // latex/math markers
  if (text.includes("$$") || text.includes("$")) return true;
  if (/\\\(|\\\)|\\\[|\\\]/.test(text)) return true;

  // common math keywords
  const keywords = [
    'solve','find','compute','calculate','simplify','expand','factor','prove','show',
    'derivative','integral','differentiate','integrate','limit','series','sum','product',
    'matrix','determinant','eigen','vector','scalar','polynomial','equation','inequality',
    'system','quadratic','probability','statistics','mean','median','mode','variance','standard deviation',
    'geometry','algebra','calculus','trigonometry','logarithm','exponential','modulo','gcd','lcm'
  ];
  if (keywords.some(k => text.includes(k))) return true;

  // numeric + operator + equals pattern (e.g., 2x+3=5)
  if (/[-+*/^].*=/.test(text)) return true;
  // variables with powers
  if (/\b[a-z]\s*\^\s*\d+/.test(text)) return true;

  // matrices like [ [1,2], [3,4] ] or |A| determinant bars
  if (/\[\s*\[[\s\S]*\]\s*\]/.test(text)) return true;
  if (/\|\s*[a-z]\s*\|/.test(text)) return true;

  return false;
}

// New, stricter detector per requirements: return true ONLY when
// 1) message contains math OR science keywords, AND
// 2) it also includes numbers or one of the symbols: = + - / ^ [ ]
export function shouldShowActionButtons(message?: string): boolean {
  if (!message) return false;
  const t = message.toLowerCase();

  // math keywords
  const mathKeywords = [
    'solve','find','calculate','compute','evaluate','equation','inequality','integral','derivative','differentiate','integrate',
    'limit','matrix','vector','determinant','eigen','polynomial','algebra','calculus','trigonometry','logarithm','exponential',
    'probability','statistics','mean','median','variance','standard deviation','factor','expand','simplify','root','gcd','lcm'
  ];
  // science/physics keywords
  const scienceKeywords = [
    'physics','force','velocity','speed','acceleration','mass','weight','momentum','impulse','torque','energy','work','power',
    'electric','voltage','current','resistance','ohm','magnetic','magnetism','field','frequency','wavelength','period',
    'pressure','density','kinematics','dynamics','projectile','circuit'
  ];

  const hasKeyword = [...mathKeywords, ...scienceKeywords].some(k => t.includes(k));
  if (!hasKeyword) return false;

  // digits or any of the specified symbols
  const hasNumbersOrSymbols = /[0-9]|[=+\-\/^\[\]]/.test(t);
  return hasNumbersOrSymbols;
}

