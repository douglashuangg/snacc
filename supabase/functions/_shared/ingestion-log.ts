import type { AdminClient } from "./database.ts";

export interface RunCounters {
  pagesRequested: number;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
}

export class IngestionRun {
  readonly counters: RunCounters = {
    pagesRequested: 0,
    recordsReceived: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
  };

  private constructor(
    private readonly client: AdminClient,
    readonly id: string,
  ) {}

  static async start(
    client: AdminClient,
    jobName: string,
    requestContext: Record<string, unknown>,
  ): Promise<IngestionRun> {
    const { data, error } = await client
      .from("rakuten_ingestion_runs")
      .insert({
        job_name: jobName,
        status: "running",
        request_context: requestContext,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return new IngestionRun(client, data.id);
  }

  async checkpoint(): Promise<void> {
    const { error } = await this.client
      .from("rakuten_ingestion_runs")
      .update({
        pages_requested: this.counters.pagesRequested,
        records_received: this.counters.recordsReceived,
        records_inserted: this.counters.recordsInserted,
        records_updated: this.counters.recordsUpdated,
        records_skipped: this.counters.recordsSkipped,
      })
      .eq("id", this.id);
    if (error) throw new Error(error.message);
  }

  async finish(
    status: "succeeded" | "failed" | "partial",
    errorSummary?: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("rakuten_ingestion_runs")
      .update({
        status,
        pages_requested: this.counters.pagesRequested,
        records_received: this.counters.recordsReceived,
        records_inserted: this.counters.recordsInserted,
        records_updated: this.counters.recordsUpdated,
        records_skipped: this.counters.recordsSkipped,
        error_summary: errorSummary?.slice(0, 2_000) ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", this.id);
    if (error) throw new Error(error.message);
  }
}
