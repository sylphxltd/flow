const text = "";
const cursorPos = 0;
const before = text.slice(0, cursorPos);
const char = text[cursorPos] || ' ';
const after = text.slice(cursorPos + 1);

console.log("before:", JSON.stringify(before));
console.log("char:", JSON.stringify(char));
console.log("after:", JSON.stringify(after));
