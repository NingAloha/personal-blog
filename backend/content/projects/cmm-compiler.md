---
title: C-- Compiler
summary: 基于 Flex、Bison 和 C 实现的 C-- 编译器课程项目。当前完成词法分析、语法分析、语法树输出与错误诊断，并用分层测试验证输入边界。
tech: ["C", "Flex", "Bison", "Make", "Compiler", "Parsing"]
startDate: "2026-09"
status: 进行中
link: https://github.com/NingAloha/cmm-compiler
featured: false
---

## 项目简介

这是一个基于 C、Flex 和 Bison 实现的 C-- 编译器课程项目。当前处于 Stage 01：程序读取一份 C-- 源文件，完成词法分析与语法分析；没有错误时以前序遍历输出语法树，有错误时输出规定格式的诊断并以非零状态码结束。

项目目前尚未进入语义分析、中间表示或代码生成阶段。这个范围是有意保留的：先把编译器前端最基础的输入边界、语法结构和错误行为做成可验证的模块，再继续扩展后续阶段。

## 实现结构

```text
C-- 源文件
  -> Flex / yylex()
  -> token + TreeNode
  -> Bison / yyparse()
  -> 语法树或错误信息
```

- `src/frontend/lexer.l`：识别关键字、标识符、运算符、数值和注释，并报告 A 类词法错误
- `src/frontend/syntax.y`：按 C-- 文法归约，处理表达式优先级、dangling else 与语法错误恢复
- `src/frontend/tree.c`、`tree.h`：用“第一个孩子 - 下一个兄弟”结构创建、连接、打印和释放语法树
- `src/driver/main.c`：驱动解析，决定成功时打印树、失败时返回非零状态

词法分析器不只返回 token 类型，还会把包含词素文本和行号的 `TreeNode` 放入 `yylval.node`。Bison 的语义动作则只需创建 `Program`、`Stmt`、`Exp` 等非终结符结点并连接子树，避免在多个阶段重复保存同一份输入信息。

## 当前能力

- 基础 C-- 文法、全局变量、结构体、数组、函数、语句和表达式
- 八进制、十六进制整数与带小数点的指数浮点数
- `//` 单行注释与非嵌套 `/* ... */` 块注释
- A 类词法错误与 B 类语法错误的分类、行号和非零退出码
- 在分号、右圆括号、右方括号和右花括号等位置进行语法错误恢复
- 通过优先级声明处理赋值、算术、逻辑运算与 dangling else

语法树的孩子追加使用 `last_child` 缓存，避免每次连接新孩子都沿兄弟链寻找末尾。结点会复制保存 Flex 的 `yytext`，因此扫描缓冲区被后续 token 复用时，已写入树的标识符和常量文字不会被覆盖。

## 测试与验证

`make test` 覆盖合法程序、词法错误和语法错误三组样例。合法样例包含结构体、数组、调用、优先级、不同进制数字和注释；错误样例覆盖非法数字、未知字符、未闭合注释、参数列表、数组下标和括号等问题。

测试记录退出码与关键输出，而不是依赖错误恢复后偶然产生的完整诊断序列。对于多错误输入，这种约束更接近编译器前端的真实行为：恢复策略可能改变后续错误数量，但首个关键错误的类别和行号仍然应稳定。

## 构建与下一步

项目依赖 `gcc`、`flex`、`bison` 与 `make`：

```bash
make
./build/parser path/to/source.cmm

make test
```

下一步将建立在现有的树、行号和模块边界上，继续实现符号表、类型检查、语义错误与中间表示。

## 项目地址

项目源码与阶段说明见：[NingAloha/cmm-compiler](https://github.com/NingAloha/cmm-compiler)
