// npm run secret  -> prints a random value to paste into JWT_SECRET in .env
import crypto from 'node:crypto';

console.log(crypto.randomBytes(48).toString('hex'));
