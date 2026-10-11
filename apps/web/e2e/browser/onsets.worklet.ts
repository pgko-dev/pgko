declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare const currentFrame: number;
declare const sampleRate: number;
declare function registerProcessor(name: string, processor: typeof Onsets): void;

class Onsets extends AudioWorkletProcessor {
  private readonly next = [0, 0];
  private frame = 0;

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    for (let input = 0; input < inputs.length; input++) {
      const samples = inputs[input][0];
      if (!samples) continue;
      for (let index = 0; index < samples.length; index++) {
        // Measure separation in rendered samples; retain the native clock independently.
        const frame = this.frame + index;
        if (frame < this.next[input] || Math.abs(samples[index]) < 0.001) continue;
        this.next[input] = frame + sampleRate * 0.1;
        this.port.postMessage({
          input,
          time: frame / sampleRate,
          contextTime: (currentFrame + index) / sampleRate,
        });
      }
    }
    this.frame += outputs[0][0].length;
    return true;
  }
}

registerProcessor("preview-onsets", Onsets);
export {};
