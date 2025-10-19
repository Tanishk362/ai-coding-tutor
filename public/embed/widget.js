(() => {
  try {
    if (window.__AI_CODING_TUTOR_WIDGET__) return;
    window.__AI_CODING_TUTOR_WIDGET__ = true;
    const script = document.currentScript;
    if (!script) return;

    // Helper to get dataset with both data-foo-bar and dataset.fooBar
    const ds = script.dataset || {};
    const mode = (ds.mode || 'float').toLowerCase(); // 'float' | 'inline'
    const slug = ds.slug || '';
    const theme = (ds.theme || 'auto').toLowerCase(); // 'light' | 'dark' | 'auto'
    const brandColor = ds.brandColor || ds['brandcolor'] || '#3B82F6';
    const position = (ds.position || 'bottom-right').toLowerCase(); // 'bottom-right' | 'bottom-left'
    const open = String(ds.open || 'false').toLowerCase() === 'true';
    const containerSelector = ds.container || null; // for inline mode
    const base = ds.base || (new URL(script.src)).origin; // allow override via data-base

    if (!slug) {
      console.warn('[widget] Missing data-slug attribute');
      return;
    }

    // Build iframe URL for the public chatbot page
    const params = new URLSearchParams();
    params.set('embed', '1');
    if (theme) params.set('theme', theme);
    if (brandColor) params.set('brand', brandColor);
    const iframeSrc = `${base}/c/${encodeURIComponent(slug)}?${params.toString()}`;

    function makeInline() {
      const container = containerSelector ? document.querySelector(containerSelector) : null;
      if (!container) {
        console.warn('[widget] Inline mode requires valid data-container selector');
        return;
      }
      const iframe = document.createElement('iframe');
      iframe.src = iframeSrc;
      iframe.setAttribute('title', 'AI Chatbot');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '1px solid #e5e7eb';
      iframe.style.borderRadius = '12px';
      iframe.style.boxShadow = '0 10px 20px rgba(0,0,0,0.08)';
      container.appendChild(iframe);
    }

    function makeFloating() {
      // Shadow DOM to isolate styles
      const host = document.createElement('div');
      host.id = 'ai-chatbot-widget-host';
      document.body.appendChild(host);
      const root = host.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = `
        .launcher {
          position: fixed;
          ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          bottom: 20px;
          width: 56px;
          height: 56px;
          border-radius: 9999px;
          display: flex; align-items: center; justify-content: center;
          color: white; background: ${brandColor || '#3B82F6'};
          box-shadow: 0 10px 20px rgba(0,0,0,0.15);
          cursor: pointer; user-select: none;
          font-size: 22px;
          z-index: 2147483000;
        }
        .panel {
          position: fixed;
          ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          bottom: 90px;
          width: 360px;
          height: 520px;
          background: transparent;
          border: none;
          z-index: 2147483000;
          display: none;
        }
        .panel.open { display: block; }
        .frame {
          width: 100%; height: 100%; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.18);
        }
      `;
      root.appendChild(style);

      const panel = document.createElement('div');
      panel.className = 'panel' + (open ? ' open' : '');
      const iframe = document.createElement('iframe');
      iframe.className = 'frame';
      iframe.src = iframeSrc;
      iframe.setAttribute('title', 'AI Chatbot');
      iframe.allow = 'microphone; camera; clipboard-read; clipboard-write;';
      panel.appendChild(iframe);

      const launcher = document.createElement('button');
      launcher.className = 'launcher';
      launcher.setAttribute('aria-label', 'Open chat');
      launcher.innerText = '💬';
      launcher.addEventListener('click', () => {
        panel.classList.toggle('open');
      });

      root.appendChild(panel);
      root.appendChild(launcher);
    }

    if (mode === 'inline') {
      makeInline();
    } else {
      makeFloating();
    }
  } catch (e) {
    console.error('[widget] failed to initialize', e);
  }
})();
