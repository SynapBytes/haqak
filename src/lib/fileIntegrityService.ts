import nodeCrypto from 'node:crypto';

const subtle = (globalThis.crypto ?? nodeCrypto).subtle;

// ... (rest of your file implementation)