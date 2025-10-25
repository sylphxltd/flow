import { createInterface } from 'node:readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Testing input...');
rl.question('Enter value: ', (input) => {
  console.log('Got input:', JSON.stringify(input));
  rl.close();
});
