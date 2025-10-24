# Progressive UI 可以做到嘅效果

## ✅ Ora Spinners (超靚嘅動畫)

```typescript
import ora from 'ora';

// 1. 基本 spinner
const spinner = ora('Loading...').start();
// ⠋ Loading...  (會轉圈)

// 2. 成功
spinner.succeed('Done!');
// ✔ Done!

// 3. 失敗
spinner.fail('Error!');
// ✖ Error!

// 4. 警告
spinner.warn('Warning!');
// ⚠ Warning!

// 5. 改變文字 (動態更新)
spinner.text = 'Installing packages...';
spinner.text = 'Almost done...';

// 6. 自訂 spinner 款式
ora({ text: 'Loading', spinner: 'dots12' }).start();
// 有好多款：dots, line, star, arrow, etc.
```

## ✅ Inquirer (超強 Interactive Input)

```typescript
import inquirer from 'inquirer';

// 1. Text Input
const answer = await inquirer.prompt([{
  type: 'input',
  name: 'username',
  message: 'Enter username:',
  default: 'admin'
}]);

// 2. Password (自動 mask)
const answer = await inquirer.prompt([{
  type: 'password',
  name: 'password',
  message: 'Enter password:',
  mask: '•'
}]);

// 3. List Selection (arrow keys 上下揀)
const answer = await inquirer.prompt([{
  type: 'list',
  name: 'model',
  message: 'Select model:',
  choices: [
    'text-embedding-3-small',
    'text-embedding-3-large',
    'text-embedding-ada-002'
  ]
}]);
// ❯ 會顯示 arrow，用 ↑↓ 揀

// 4. Checkbox (多選)
const answer = await inquirer.prompt([{
  type: 'checkbox',
  name: 'features',
  message: 'Select features:',
  choices: [
    { name: 'TypeScript', checked: true },
    { name: 'React' },
    { name: 'Testing' }
  ]
}]);

// 5. Confirm (Y/n)
const answer = await inquirer.prompt([{
  type: 'confirm',
  name: 'continue',
  message: 'Continue?',
  default: true
}]);

// 6. Number Input
const answer = await inquirer.prompt([{
  type: 'number',
  name: 'count',
  message: 'How many?',
  default: 10
}]);

// 7. Editor (opens text editor)
const answer = await inquirer.prompt([{
  type: 'editor',
  name: 'content',
  message: 'Enter content:'
}]);
```

## ✅ Chalk (顏色 + 樣式)

```typescript
import chalk from 'chalk';

// 顏色
chalk.red('Error')
chalk.green('Success')
chalk.yellow('Warning')
chalk.cyan('Info')

// 樣式
chalk.bold('Bold')
chalk.italic('Italic')
chalk.underline('Underline')
chalk.dim('Dim')

// 組合
chalk.bold.red('Bold Red')
chalk.cyan.underline('Cyan Underline')

// 背景色
chalk.bgRed.white('White on Red')
chalk.bgGreen.black('Black on Green')

// RGB colors
chalk.rgb(255, 136, 0)('Orange')
chalk.hex('#FF8800')('Orange')
```

## 🎨 實際效果示範

### Init Command 會係咁：

```
▸ Sylphx Flow Setup
  Target: opencode

▸ Configure MCP Tools
  Configure API keys and settings

▸ sylphx-flow
  Sylphx Flow MCP server for agent coordination

? OPENAI_API_KEY * ••••••••
  OPENAI_API_KEY: ••••••••
? OPENAI_BASE_URL https://api.openai.com/v1
  OPENAI_BASE_URL: https://api.openai.com/v1
? EMBEDDING_MODEL (Use arrow keys)
❯ text-embedding-3-small
  text-embedding-3-large
  text-embedding-ada-002
  EMBEDDING_MODEL: text-embedding-3-small

▸ gpt-image
  GPT Image generation MCP server

? OPENAI_API_KEY * ••••••••
  OPENAI_API_KEY: ••••••••

⠋ Saving MCP configuration...
✔ MCP tools configured
⠋ Installing agents...
✔ Agents installed
⠋ Installing rules...
✔ Rules installed

✓ Setup complete!
  Start coding with Sylphx Flow
```

## 🆚 對比

| Feature | React Ink | Ora + Inquirer |
|---------|-----------|----------------|
| Spinners | ✅ | ✅✅ (更多款式) |
| Text Input | ✅ | ✅✅ (更好用) |
| Password | ✅ | ✅✅ (自動 mask) |
| Dropdown | ✅ | ✅✅ (arrow keys) |
| Checkbox | ❌ | ✅ |
| Progressive Output | ❌ | ✅✅ |
| Keep History | ❌ | ✅✅ |
| 動畫 | ✅ | ✅ |
| 易用 | ⚠️ (複雜) | ✅✅ (簡單) |

## 結論

用 **Ora + Inquirer + Chalk** 可以做到：
- ✅ 所有 React Ink 嘅動畫效果
- ✅ 更好嘅 interactive input
- ✅ Progressive output (保留 history)
- ✅ 更簡單嘅 API
- ✅ 更輕量

唯一 React Ink 嘅優勢：
- 完全自訂 layout (好似 TUI app)
- 但對於 CLI commands，唔需要咁複雜
