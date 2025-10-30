# Functional Programming Libraries Comparison

## 問題：用 Third-Party Library 會唔會方便啲？

答案：**視乎 project 需求**。以下係詳細分析。

---

## 主流 FP Libraries

### 1. **fp-ts** (推薦度: ⭐⭐⭐⭐⭐)
最完整嘅 TypeScript functional library

```typescript
// fp-ts example
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

const result = pipe(
  E.right(5),
  E.map(x => x * 2),
  E.fold(
    error => `Error: ${error}`,
    value => `Success: ${value}`
  )
);
```

**優點：**
- ✅ 功能最完整 (Monad, Functor, Applicative 等)
- ✅ TypeScript-first，type safety 極好
- ✅ Battle-tested，社區大
- ✅ 有完整嘅 ecosystem (io-ts, monocle-ts 等)
- ✅ 符合 Haskell/Scala 嘅 FP 標準

**缺點：**
- ❌ Bundle size 大 (~50KB minified)
- ❌ Learning curve 陡峭
- ❌ API 複雜 (需要學 Category Theory concepts)
- ❌ 可能 overkill for simple projects

**幾時用：**
- 大型 enterprise project
- Team 有 FP 經驗
- 需要進階 FP patterns (Monad transformers 等)

---

### 2. **Effect** (推薦度: ⭐⭐⭐⭐)
新一代 TypeScript FP library

```typescript
import { Effect } from 'effect';

const program = Effect.gen(function* (_) {
  const user = yield* _(getUserById('123'));
  const orders = yield* _(getOrders(user.id));
  return { user, orders };
});
```

**優點：**
- ✅ 現代化 API (用 generator syntax)
- ✅ 內置 dependency injection
- ✅ 強大嘅 error handling
- ✅ 好嘅 developer experience

**缺點：**
- ❌ 相對新 (less mature)
- ❌ Bundle size 都唔細
- ❌ 都要學新 concepts

---

### 3. **Ramda** (推薦度: ⭐⭐⭐)
經典 JavaScript FP library

```typescript
import * as R from 'ramda';

const processUsers = R.pipe(
  R.filter(R.propEq('active', true)),
  R.map(R.prop('email')),
  R.map(R.toLower)
);
```

**優點：**
- ✅ API 簡單易用
- ✅ 社區成熟
- ✅ 好多 utilities

**缺點：**
- ❌ TypeScript support 麻麻
- ❌ Bundle size 大
- ❌ Performance 唔係最好

---

### 4. **Lodash/fp** (推薦度: ⭐⭐)
Lodash 嘅 FP version

```typescript
import fp from 'lodash/fp';

const result = fp.pipe(
  fp.filter(x => x.active),
  fp.map(x => x.name)
)(users);
```

**優點：**
- ✅ 如果已經用緊 Lodash
- ✅ Familiar API

**缺點：**
- ❌ 唔係 FP-first design
- ❌ Bundle size 大

---

## 我哋 Custom Implementation

### 當前實現 (推薦度: ⭐⭐⭐⭐)

```typescript
import { Result, pipe } from '@/core/functional';
import { Arr } from '@/utils/functional';

const result = pipe(
  users,
  Arr.filter(u => u.active),
  Arr.map(u => u.email)
);
```

**優點：**
- ✅ **Zero dependencies** - Bundle size 最細
- ✅ **完全控制** - 可以隨時 customize
- ✅ **簡單易明** - Team 易 onboard
- ✅ **符合 project needs** - 無多餘功能
- ✅ **Performance** - 無 library overhead
- ✅ **Tree-shakeable** - 只 import 用到嘅

**缺點：**
- ❌ 功能無咁完整 (無 Monad transformers 等)
- ❌ 要自己維護
- ❌ 無 community support

---

## 決策矩陣

| 因素 | Custom | fp-ts | Effect | Ramda |
|------|--------|-------|--------|-------|
| Bundle Size | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| Learning Curve | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Type Safety | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Functionality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 建議

### ✅ 繼續用 Custom Implementation 如果：

1. **Project 唔太複雜** - 現有功能已經足夠
2. **Bundle size matters** - 例如 browser application
3. **Team 係 FP 新手** - 簡單 API 易學
4. **想完全控制** - 可以隨時改
5. **已經有 working code** - 唔洗重寫

**當前 project 符合呢啲條件！**

### 🔄 考慮轉用 fp-ts 如果：

1. **需要進階 FP patterns**
   - Monad transformers
   - Free monads
   - Applicative validation

2. **Team 有 FP 經驗**
   - 識 Haskell/Scala
   - 想用標準 FP patterns

3. **Project 會變得好複雜**
   - 大量 async operations
   - 複雜 state management
   - 需要 effect system

### 🔄 考慮轉用 Effect 如果：

1. **需要 dependency injection**
2. **有複雜 effect management**
3. **想要更好嘅 DX** (developer experience)

---

## 混合方案 (Hybrid Approach)

其實可以**混合使用**！

```typescript
// 保留 custom utilities (輕量)
import { Arr, Str } from '@/utils/functional';

// 用 fp-ts for 進階 patterns (只 import 需要嘅)
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Custom utilities for simple operations
const emails = Arr.map(Str.toLowerCase)(userEmails);

// fp-ts for complex async error handling
const result = pipe(
  TE.tryCatch(
    () => fetchUser(id),
    (error) => new Error(String(error))
  ),
  TE.chain(user => saveUser(user)),
  TE.fold(
    error => console.error(error),
    user => console.log(user)
  )
);
```

---

## 實際例子對比

### 例子 1: Simple Array Processing

**Custom (當前):**
```typescript
import { Arr } from '@/utils/functional';

const activeEmails = pipe(
  users,
  Arr.filter(u => u.active),
  Arr.map(u => u.email)
);
// Bundle: +0 KB (已經有)
// 易明度: ⭐⭐⭐⭐⭐
```

**fp-ts:**
```typescript
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

const activeEmails = pipe(
  users,
  A.filter(u => u.active),
  A.map(u => u.email)
);
// Bundle: +50 KB
// 易明度: ⭐⭐⭐⭐
```

**結論：Custom 更好** - 功能一樣，但更輕更易明

---

### 例子 2: Complex Async Error Handling

**Custom (當前):**
```typescript
import { Result, flatMap } from '@/core/functional';

async function process() {
  const user = await getUser();
  if (isFailure(user)) return user;

  const orders = await getOrders(user.value.id);
  if (isFailure(orders)) return orders;

  return success({ user: user.value, orders: orders.value });
}
// 要手動處理每個 step
```

**fp-ts:**
```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

const process = pipe(
  TE.tryCatch(() => getUser(), toError),
  TE.chain(user =>
    pipe(
      TE.tryCatch(() => getOrders(user.id), toError),
      TE.map(orders => ({ user, orders }))
    )
  )
);
// 自動處理 error propagation
```

**結論：fp-ts 更好** - 對於複雜 async operations

---

## 最終建議

### 對於當前 Project：**保持 Custom Implementation** ✅

**理由：**
1. **已經實現晒** - 有 52 tests 全部 pass
2. **功能足夠** - 涵蓋 project 需要嘅 patterns
3. **Zero dependencies** - Bundle size 最優
4. **Team friendly** - API 簡單，易 onboard
5. **可擴展** - 有需要先加功能

### 未來可以考慮：

```typescript
// Phase 1 (當前): Custom implementation ✅
import { Result, pipe } from '@/core/functional';

// Phase 2 (如有需要): 加 fp-ts for specific use cases
import * as TE from 'fp-ts/TaskEither';  // 只 import 需要嘅

// Phase 3 (如 project 變好複雜): 全面用 fp-ts
// 但要 team 有 FP 經驗先
```

---

## 總結

| 方案 | 適合情況 | Bundle Size | Learning Curve |
|------|---------|-------------|----------------|
| **Custom** | 當前 project ✅ | 最細 | 最易 |
| **fp-ts** | Enterprise/Complex | 大 | 難 |
| **Effect** | Modern/DI needed | 中 | 中 |
| **Ramda** | Simple/Legacy | 大 | 易 |

**結論：當前 custom implementation 係最佳選擇！** 🎯

如果將來 project 變複雜，可以漸進式加入 fp-ts for specific patterns，唔需要全部重寫。
