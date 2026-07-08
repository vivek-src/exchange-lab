export class Snowflake {
  private sequence = 0;
  private lastTimestamp = -1;

  constructor(
    private readonly workerId: number,
    private readonly epoch = 1767225600000, // 2026-01-01 UTC
  ) {
    if (workerId < 0 || workerId > 1023) {
      throw new Error("workerId must be between 0 and 1023");
    }
  }

  private currentTimestamp(): number {
    return Date.now();
  }

  private waitNextMillis(lastTimestamp: number): number {
    let timestamp = this.currentTimestamp();

    while (timestamp <= lastTimestamp) {
      timestamp = this.currentTimestamp();
    }

    return timestamp;
  }

  generate(): bigint {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new Error(
        `Clock moved backwards by ${this.lastTimestamp - timestamp}ms`,
      );
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff;

      if (this.sequence === 0) {
        timestamp = this.waitNextMillis(this.lastTimestamp);
      }
    } else {
      this.sequence = 0;
    }

    this.lastTimestamp = timestamp;

    return (
      (BigInt(timestamp - this.epoch) << 22n) |
      (BigInt(this.workerId) << 12n) |
      BigInt(this.sequence)
    );
  }
}
