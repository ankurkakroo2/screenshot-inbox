import { join } from 'node:path';
import { homedir } from 'node:os';
import { Inbox } from './inbox.js';
import { Models } from './models.js';
const models = new Models();
try {
  const [command, folder, state = join(homedir(), '.local', 'share', 'screenshot-inbox'), argument = '', mode = 'hybrid'] = process.argv.slice(2);
  if (!['index', 'search', 'original'].includes(command) || !folder) throw new Error('Usage: node src/cli.js <index|search|original> <folder> [state-directory] [query|id] [visual|text|hybrid]');
  const inbox = new Inbox(folder, state, models);
  const result = command === 'index' ? await inbox.index() : command === 'search' ? await inbox.search(argument, mode) : await inbox.original(argument);
  process.stdout.write(JSON.stringify(result)+'\n');
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error.message })+'\n');
  process.exitCode = 1;
} finally { await models.close(); }
