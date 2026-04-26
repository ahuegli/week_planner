export class ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export class CoachChatRequestDto {
  messages: ChatMessageDto[];
  context?: string;
}

export class SuggestedActionDto {
  type: 'reschedule' | 'skip' | 'swap' | 'note';
  description: string;
  sessionId?: string;
  newValues?: Record<string, unknown>;
}

export class CoachChatResponseDto {
  reply: string;
  suggestedAction?: SuggestedActionDto;
}
