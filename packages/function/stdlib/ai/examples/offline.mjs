import { MockAgent } from 'near-function/ai/mock';
for await (const event of new MockAgent().run({ prompt: 'Hello from a server-only consumer' })) console.log(event);
