# Chat Naming Fix - October 10, 2025

## Issue Fixed

**Problem**: Chat names were being set based on timestamps (e.g., "Chat on 10/10/2025 02:47 PM") instead of the actual conversation content.

**Solution**: Updated the chat naming system to use the first user message content as the conversation title.

## Changes Made

### 1. **New Chat Creation** (`onNewChat` function)
- Changed from timestamp-based naming to simple "New Chat" as the initial title
- Removed: `Chat on ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
- Now uses: `'New Chat'`
- The title will be automatically updated when the user sends their first message

### 2. **Auto-Naming on First Message** (`sendText` function)
Added logic to automatically rename conversations based on the first user message:

```typescript
// For new conversations
if (!cidBefore && data?.conversationId) {
  const autoTitle = (text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').trim() || 'New Chat').slice(0, 60);
  // Update locally
  setChatName(autoTitle);
  setConvs((prev) => [{ id: newId, title: autoTitle, updated_at: new Date().toISOString() }, ...prev]);
  // Update on server
  await fetch(`/api/bots/${slug}/conversations/${newId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: autoTitle }),
  });
}

// For existing conversations that still have default title
else if (cidBefore && chatName === 'New Chat') {
  const autoTitle = (text.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').trim() || 'New Chat').slice(0, 60);
  // Update both locally and on server
}
```

### Key Features:
- **Content-based**: Uses the first 60 characters of the user's first message
- **Clean titles**: Strips image markdown syntax from the title
- **Automatic sync**: Updates both the local state and the server
- **Fallback**: If the message is empty or only contains images, defaults to "New Chat"
- **Smart detection**: Only auto-renames if the title is still "New Chat"

## Files Modified

1. **src/components/public/PersistentChat.tsx**
   - Updated `onNewChat()` to use "New Chat" instead of timestamp
   - Enhanced `sendText()` to auto-rename conversations based on first message
   - Added server-side title update via PATCH API call

## API Endpoint Used

- **PATCH** `/api/bots/[slug]/conversations/[cid]`
  - Already existed in the codebase
  - Accepts `{ title: string }` in the request body
  - Updates the conversation title on the server

## Behavior

1. **Creating a new chat**: Shows "New Chat" in the sidebar
2. **Sending first message**: 
   - Example: User types "How do I solve quadratic equations?"
   - Chat is automatically renamed to: "How do I solve quadratic equations?" (or truncated to 60 chars)
3. **Subsequent messages**: Title remains unchanged (can still be manually edited)
4. **Manual rename**: Users can still click "Edit Chat Name" to customize the title

## Benefits

- ✅ More descriptive conversation titles
- ✅ Easy to find previous conversations
- ✅ Better user experience
- ✅ Automatic - no user action required
- ✅ Maintains backward compatibility with manual renaming
