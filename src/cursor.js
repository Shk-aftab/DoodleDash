let cursor = null;

export function InitializeCursor() {
  if (cursor) {
    document.body.removeChild(cursor);
  }
  cursor = document.createElement('div');
  cursor.style.width = '20px';
  cursor.style.height = '20px';
  cursor.style.backgroundColor = 'blue';
  cursor.style.position = 'fixed';
  cursor.style.borderRadius = '50%';
  cursor.style.pointerEvents = 'none';
  cursor.style.zIndex = '9999';
  cursor.style.transition = 'transform 0.1s ease-out';
  document.body.appendChild(cursor);
  SetCursorVisibility(true);
  console.log("Cursor initialized");
}

export function SetCursorVisibility(visible) {
  if (cursor) {
    cursor.style.display = visible ? 'block' : 'none';
    // console.log("Cursor visibility set to:", visible);
  }
}

export function SetCursorColor(color) {
  if (cursor) {
    cursor.style.backgroundColor = color;
    // console.log("Cursor color set to:", color);
  }
}

export function SetCursorPosition(left, top) {
  if (cursor) {
    const cursorSize = 20; // Size of the cursor in pixels
    const halfCursorSize = cursorSize / 2;
    
    // Use fixed positioning instead of transform
    cursor.style.left = `${left - halfCursorSize}px`;
    cursor.style.top = `${top - halfCursorSize}px`;
    
    // console.log("Cursor position set to:", left, top);
  }
}