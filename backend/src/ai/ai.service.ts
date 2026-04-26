import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async chat(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    return (textBlock as { type: 'text'; text: string } | undefined)?.text ?? "I couldn't generate a response. Try again.";
  }
}
