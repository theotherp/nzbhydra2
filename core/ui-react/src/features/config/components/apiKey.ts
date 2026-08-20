const API_KEY_LENGTH = 24;
const API_KEY_ALPHABET =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * 24 alphanumeric characters, legacy's alphabet and length
 * (`formly-config.js#apiKeyInput`). Drawn from `crypto.getRandomValues` rather
 * than legacy's `Math.random`, because this is the credential that guards the
 * whole API; rejection sampling keeps the distribution uniform over the
 * 62-character alphabet.
 */
export function generateApiKey(): string {
    const limit =
        Math.floor(256 / API_KEY_ALPHABET.length) * API_KEY_ALPHABET.length;
    let key = "";
    const buffer = new Uint8Array(API_KEY_LENGTH);
    while (key.length < API_KEY_LENGTH) {
        crypto.getRandomValues(buffer);
        for (const byte of buffer) {
            if (byte < limit && key.length < API_KEY_LENGTH) {
                key += API_KEY_ALPHABET[byte % API_KEY_ALPHABET.length];
            }
        }
    }
    return key;
}
