# @creadev.org/lock

> Lock - mutex, sync primitives

[![npm](https://img.shields.io/npm/v/@creadev.org/lock)](https://www.npmjs.com/package/@creadev.org/lock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install @creadev.org/lock
```

## Usage

```typescript
import { Lock, createLock, acquire, release } from '@creadev.org/lock';

const lock = createLock();
const token = await acquire('resource');
await release(token);
```

## API

| Function | Description |
|----------|-------------|
| `createLock(options?)` | Create lock instance |
| `acquire(resource)` | Acquire lock |
| `release(token)` | Release lock |

## License

MIT
trigger
# Mon May 11 15:11:13 UTC 2026
