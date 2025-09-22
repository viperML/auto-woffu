export function log(...message: unknown[]) {
    console.log(`[${new Date().toISOString()}]`, ...message);
}
