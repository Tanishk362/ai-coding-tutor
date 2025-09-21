import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatPreview } from '@/src/components/preview/ChatPreview';

describe('ChatPreview', () => {
  it('renders greeting and applies brand color', async () => {
    render(
      <div style={{ height: 600 }}>
        <ChatPreview
          name="Test Bot"
          avatarUrl={''}
          brandColor="#ff0000"
          bubbleStyle="rounded"
          greeting="Hello there"
          typingIndicator={true}
          starterQuestions={["What can you do?"]}
        />
      </div>
    );

    expect(screen.getByText('Hello there')).toBeInTheDocument();
    // send a message to render a user bubble with brand color
    const input = screen.getByPlaceholderText('Ask me anything') as HTMLInputElement;
    input.value = 'Hi';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
});

