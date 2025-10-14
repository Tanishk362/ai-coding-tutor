# Photo Upload Fixes - October 10, 2025

## Issues Fixed

### Issue 1: Cannot Send Photo with Text
**Problem**: Users were required to send text along with photos. The button said "Attach" which was confusing.

**Solution**:
- Modified `PersistentChat.tsx` to allow sending photos with or without accompanying text
- Renamed the "Attach" button to "Send with Photo" for clarity
- Updated `sendImage()` function to `sendImageWithText()` which reads any text from the input field and combines it with the image
- Updated form submit handler to automatically use `sendImageWithText()` when an image is attached

### Issue 2: Server Error After Sending Photo
**Problem**: After sending a photo with text, subsequent messages would fail with a "context_length_exceeded" error showing 751,578 tokens (exceeding the 272,000 token limit).

**Root Cause**: 
- Photos were being embedded as base64 data URIs (hundreds of thousands of characters)
- The entire conversation history including these massive base64 images was being sent with every new message
- This caused exponential growth in token usage

**Solution**:
- Added message history cleanup in both `/api/bots/[slug]/chat/route.ts` and `/api/preview/chat/route.ts`
- Strip base64 data URIs from all user messages EXCEPT the last one
- Replace stripped images with `[image removed]` placeholder for context
- Only the most recent user message retains its images for vision processing
- This keeps conversation history manageable while maintaining image analysis capability for the current message

## Files Modified

1. **src/components/public/PersistentChat.tsx**
   - Renamed `sendImage()` to `sendImageWithText()`
   - Updated to combine input text with image before sending
   - Modified form submit handler to call `sendImageWithText()` when image is present
   - Changed button text from "Attach" to "Send with Photo"
   - Fixed conversation title generation to strip image markdown

2. **src/components/preview/ChatPreview.tsx**
   - Updated `send()` function to allow sending images with or without text
   - Changed button text from "Attach" to "Send with Photo"

3. **app/api/bots/[slug]/chat/route.ts**
   - Added message history cleanup logic
   - Strips base64 images from all but the last user message
   - Prevents token overflow on subsequent messages

4. **app/api/preview/chat/route.ts**
   - Added same message history cleanup logic
   - Ensures preview mode also handles images correctly

## Testing Recommendations

1. Test sending a photo without any text
2. Test sending a photo with accompanying text
3. Test sending multiple messages after uploading a photo
4. Verify that image analysis still works on the first message with photo
5. Confirm no server errors occur on subsequent text-only messages after photo upload
6. Test with different image sizes and formats

## Technical Notes

- Images are stored as markdown image syntax: `![uploaded image](data:image/...base64...)`
- Vision models (like gpt-4o-mini) are automatically selected when images are detected
- The cleanup happens server-side to ensure client-side code remains simple
- Message history is limited to last 14 messages (configured separately from image cleanup)
