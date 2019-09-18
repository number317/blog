+++
title = "C Memory Leak"
date = 2019-08-06T09:07:27+08:00
draft = true
tags = ["memory leak"]
categories = ["c"]
+++

# c 语言内存泄漏检查

## Address Sanitizer

[Asan](https://github.com/google/sanitizers/wiki/AddressSanitizer) 是 gcc 内置工具，可用来检测内存错误。

```bash
gcc -fsanitize=address -fno-omit-frame-pointer --std=gnu11 -g hello.c
```
