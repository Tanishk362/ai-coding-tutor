export function normalizeChatbotPatch(p: any) {
  const out: any = { ...p };
  if (p && typeof p === 'object') {
    if (p.integrations && typeof p.integrations === 'object') {
      out.integrations = {
        google_drive: !!p.integrations.google_drive,
        slack: !!p.integrations.slack,
        notion: !!p.integrations.notion,
      };
      // remove stray top-level keys if present
      delete out.google_drive;
      delete out.slack;
      delete out.notion;
    } else {
      // build integrations object from potential top-level flags
      if ('google_drive' in p || 'slack' in p || 'notion' in p) {
        out.integrations = {
          google_drive: !!p.google_drive,
          slack: !!p.slack,
          notion: !!p.notion,
        };
        delete out.google_drive;
        delete out.slack;
        delete out.notion;
      }
    }
    if (Array.isArray(p.rules)) {
      out.rules = p.rules;
    }
  }
  return out;
}

