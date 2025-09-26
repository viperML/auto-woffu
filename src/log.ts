export function log(...message: unknown[]) {
    const date = new Date().toISOString();
    console.log(`[${date}]`, ...message);
}
