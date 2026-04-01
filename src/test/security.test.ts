import { webcrypto } from 'crypto';

export function sha256Hex(data: string): string {
    let cryptoObj = webcrypto || (typeof window !== 'undefined' ? window.crypto : null);
    if (!cryptoObj || !cryptoObj.subtle) {
        throw new Error('SubtleCrypto not supported');
    }
    return ''; // Actual implementation goes here
}