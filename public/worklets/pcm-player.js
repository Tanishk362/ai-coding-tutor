class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.readIndex = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'chunk') {
        const buf = e.data.payload; // Float32Array buffer
        if (buf && buf.length) this.buffer.push(buf);
      }
    };
  }

  process(_inputs, outputs, _parameters) {
    const output = outputs[0];
    const channel = output[0]; // mono
    const frames = channel.length; // 128 frames typically

    let written = 0;
    while (written < frames) {
      if (this.buffer.length === 0) {
        // fill silence
        for (let i = written; i < frames; i++) channel[i] = 0;
        break;
      }
      let current = this.buffer[0];
      let available = current.length - this.readIndex;
      let needed = frames - written;
      let copyCount = Math.min(available, needed);
      // Copy samples
      for (let i = 0; i < copyCount; i++) {
        channel[written + i] = current[this.readIndex + i];
      }
      written += copyCount;
      this.readIndex += copyCount;
      if (this.readIndex >= current.length) {
        this.buffer.shift();
        this.readIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-player', PCMPlayerProcessor);
