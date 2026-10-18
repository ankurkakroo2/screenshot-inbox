import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
// Original geometric app mark, generated at build time; never a user image.
await mkdir('.local', {recursive:true});
await sharp(Buffer.from('<svg width="1024" height="1024"><rect width="1024" height="1024" rx="180" fill="#266044"/><path d="M260 280h504v360H260z" fill="none" stroke="white" stroke-width="52"/><path d="M300 600l160-180 120 120 100-80 70 140" fill="none" stroke="white" stroke-width="40"/><path d="M340 760h344" stroke="white" stroke-width="48"/></svg>')).png().toFile('.local/icon.png');
