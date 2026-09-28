// Owner: API role. Re-exported from greenApi.ts, which is the public entry point.

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'GreenApiError'
  }
}
