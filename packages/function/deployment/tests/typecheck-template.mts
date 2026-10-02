import {createTemplateServer, type TemplateOptions} from 'near-v/templates/open-dot/server';
import {planTemplate} from 'near-v/templates/plan';
const configuration:TemplateOptions={storage:'memory',provider:{kind:'mock'},gptLive:{apiKey:'fixture-only',model:'chosen-model',allowPaidRequests:true,executeDelegation:async({delegationId,context},{signal})=>`${delegationId}:${context.messages.length}:${signal.aborted}`}};
const app=createTemplateServer(configuration);
const protocol:'openaiRealtime'|'gptLive'|null=app.config.voiceProtocol;
const plan=planTemplate({voiceProtocol:'gptLive',previous:{stores:[]}});
void [protocol,plan];
