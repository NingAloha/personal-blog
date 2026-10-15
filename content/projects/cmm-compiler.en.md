---
title: C-- Compiler
summary: A C-- compiler course project built with Flex, Bison, and C. The current stage implements lexical analysis, syntax analysis, syntax-tree output, and error reporting, with layered tests for the language's input boundaries.
tech: ["C", "Flex", "Bison", "Make", "Compiler", "Parsing"]
startDate: "2026-09"
status: In progress
link: https://github.com/NingAloha/cmm-compiler
featured: false
---

## Overview

This is a C-- compiler course project implemented with C, Flex, and Bison. It is currently at Stage 01: the program reads a C-- source file, performs lexical and syntax analysis, prints a syntax tree in preorder when no errors occur, and reports diagnostics with a nonzero exit status otherwise.

The project has not yet moved into semantic analysis, intermediate representation, or code generation. That boundary is intentional: the first goal is to make the compiler front end's input rules, syntax structure, and error behavior independently verifiable before extending later stages.

## Implementation Structure

```text
C-- source file
  -> Flex / yylex()
  -> token + TreeNode
  -> Bison / yyparse()
  -> syntax tree or diagnostics
```

- `src/frontend/lexer.l`: recognizes keywords, identifiers, operators, numbers, and comments, and reports type-A lexical errors
- `src/frontend/syntax.y`: reduces the C-- grammar and handles expression precedence, dangling else, and syntax-error recovery
- `src/frontend/tree.c` and `tree.h`: create, connect, print, and free the syntax tree through a first-child/next-sibling representation
- `src/driver/main.c`: drives parsing and decides whether to print the tree or return a failure status

The lexer does more than return token kinds. It places a `TreeNode` containing the lexeme and source line into `yylval.node`. Bison actions can then create nonterminals such as `Program`, `Stmt`, and `Exp` and connect their subtrees without storing the same input information again in a later stage.

## Current Capabilities

- Core C-- grammar: global variables, structs, arrays, functions, statements, and expressions
- Octal and hexadecimal integers, plus exponent-form floating-point literals with decimal points
- `//` line comments and non-nested `/* ... */` block comments
- Type-A lexical and type-B syntax diagnostics with line numbers and nonzero exit status
- Syntax-error recovery at semicolons, closing parentheses, closing brackets, and closing braces
- Precedence declarations for assignment, arithmetic, logical operators, and dangling else

The syntax tree caches `last_child` while appending children, avoiding a traversal of the sibling chain for every insertion. Nodes also copy Flex's `yytext`, so identifiers and literals already stored in the tree remain intact when the scanner reuses its input buffer for later tokens.

## Testing and Validation

`make test` covers valid programs, lexical errors, and syntax errors. Valid cases include structs, arrays, calls, precedence, multiple number formats, and comments. Invalid cases cover malformed numbers, unknown characters, unterminated comments, parameter lists, array indexing, and parentheses.

Tests assert exit status and key output rather than depending on the exact full sequence of diagnostics produced after recovery. For inputs with several errors, that matches the nature of a compiler front end more closely: recovery policy may change later diagnostics, while the type and line of the first target error should remain stable.

## Building and Next Steps

The project requires `gcc`, `flex`, `bison`, and `make`:

```bash
make
./build/parser path/to/source.cmm

make test
```

The next stage will build on the existing tree, line numbers, and module boundaries to implement symbol tables, type checking, semantic errors, and an intermediate representation.

## Project Link

Source code and stage notes are available at [NingAloha/cmm-compiler](https://github.com/NingAloha/cmm-compiler).
