---
title: "Bash Expansion"
date: 2017-10-13T13:43:35+08:00
draft: false
---

# bash 扩展

<!--more-->

以下bash扩展优先级从低到高排列

## brace expansion (花括号扩展)

是一种可能产生任意字符串的机制。这种机制类似于路径扩展，但是并不需要存在相应的文件。

花括号扩展的模式是一个可选的 preamble(前导字符)，后面跟着一系列逗号分隔的字符串，包含在一对花括号中，再后面是一个可选的 postscript(附言)。前导被添加到花括号中的每个字符串前面，附言被附加到每个结果字符串之后，从左到右进行扩展。

花括号扩展可以嵌套。扩展字符串的结果没有排序，而是保留了从左到右的顺序。例如，`a{d,c,b}e`扩展为`ade ace abe`。


花括号扩展是在任何其他扩展之前进行的，任何对其他扩展有特殊意义的字符 都保留在结果中。它是严格字面上的。 Bash 不会对扩展的上下文或花括号中的文本做任何语义上的解释。


这种结构通常用来简写字符串的公共前缀远比上例中为长的情况，例如：

```
mkdir /usr/local/src/bash/{old,new,dist,bugs}
```

或者：

```
chown root /usr/{ucb/{ex,edit},lib/{ex?.?*,how_ex}}
```

## tilde expansion (波浪线扩展)

如果一个词以没有引用的波浪线字符(`~`)开始，所有在第一个没有引用的斜线(`/`)之前的字符 (或者是这个词的所有字符，如果没有没引用的斜线的话)都被认为是tilde-prefix(波浪线前缀)。

如果 tilde-prefix 中没有被引用的字符，那么波浪线之后的字符串被认为是 login name(登录名)。如果登录名是空字符串，波浪线将被替换为 shell 参数 HOME 的值。如果没有定义 HOME，将替换为执行此 shell 的用户的个人目录。否则，tilde-prefix 被替换为与指定登录名相联系的个人目录。

如果 tilde-prefix 是`~+`，将使用 shell 变量 PWD 的值来替换。如果 tilde-prefix 是`~-`，并且设置了 shell 变量 OLDPWD,将使用这个变量值来替换。如果在 tilde-prefix 中，波浪线之后的字符串由一个数字N组成，前缀可选的`+`或者`-`，那么 tilde-prefix 将被替换为目录栈中相应的元素，就是将 tilde-prefix 作为参数执行内建命令 dirs 显示的结果。如果 tilde-prefix 中波浪线之后的字符是一个数字，没有前缀，那么就假定有一个`+`。

如果登录名不合法，或者波浪线扩展失败，这个词将不会变化。

在变量赋值中，对于:或=之后的字符串会立即检查未引用的 tilde-prefix。这种情况下，仍然会进行波浪线扩展。因此，可以使用带波浪线的文件名来为 PATH,MAILPATH,和 CDPATH 赋值，shell 将赋予扩展之后的值。

## parameter and variable expansion (参数和变量扩展)

字符`$`引入了参数扩展，命令替换和算术扩展。要扩展的参数名或符号可能包含在花括号中，花括号可选的，但是可以使得要扩展的变量不会与紧随其后的字符合并，成为新的名称。

使用花括号的时候，匹配的右括号是第一个`}`，并且它没有被反斜杠引用或包含在一个引用的字符串中，也没有包含在一个嵌入的算术扩展，命令替换或是参数扩展中。

${parameter}被替换为 parameter 的值。如果 parameter 是一个位置参数，并且数字多于一位时；或者当紧随 parameter 之后有不属于名称一部分的字符时，都必须加上花括号。

如果 parameter 的第一个字符是一个感叹号，将引进一层间接变量。bash 使用以 parameter 的其余部分为名的变量的值作为变量的名称；接下来新的变量被扩展，它的值用在随后的替换当中，而不是使用 parameter 自身的值。这也称为 indirect expansion(间接扩展)。例外情况是下面讲到的 ${!prefix*}。

下面的每种情况中，word 都要经过波浪线扩展，参数扩展，命令替换和算术扩展。如果不进行子字符串扩展，bash 测试一个没有定义或值为空的参数；忽略冒号的结果是只测试未定义的参数。

```
${parameter:-word}
```

Use Default Values(使用默认值)。如果 parameter 未定义或值为空，将替换为 word 的扩展。否则，将替换为 parameter 的值。

```
${parameter:=word}
```

Assign Default Values(赋默认值)。如果 parameter 未定义或值为空， word 的扩展将赋予 parameter.  parameter 的值将被替换。位置参数和特殊参数不能用这种方式赋值。

```
${parameter:?word}
```

Display   Error   if   Null   or   Unset(显示错误，如果未定义或值为空)。如果   parameter  未定义或值为空，word  (或一条信息，如果  word  不存在)  的扩展将写入到标准错误；shell
如果不是交互的，则将退出。否则， parameter 的值将被替换。

```
${parameter:+word}
```

Use Alternate Value(使用可选值)。如果 parameter 未定义或非空，不会进行替换；否则将替换为 word 扩展后的值。

```
${parameter:offset}
${parameter:offset:length}
```

Substring  Expansion(子字符串扩展)。  扩展为parameter  的最多  length  个字符，从  offset  指定的字符开始。如果忽略了   length，扩展为   parameter   的子字符串，   从   offset指定的字符串开始。length  和 offset 是算术表达式 (参见下面的 ARITHMETIC EVALUATION 算parameter 的值的末尾算起的偏移量。如果 parameter 是 @，结果是 length 个位置参数，从 offset 开始。 如果 parameter 是一个数组名，以 @ 或 * 索引，结果是数组的  length  个成员，从${parameter[offset]} 开始。 子字符串的下标是从 0 开始的，除非使用位置参数时，下标从 1 开始。

```
${!prefix*}
```

扩展为名称以 prefix 开始的变量名，以特殊变量 IFS 的第一个字符分隔。

```
${#parameter}
```

替换为 parameter 的值的长度 (字符数目)。如果 parameter 是 * 或者是 @, 替换的值是位置参数的个数。如果 parameter 是一个数组名，下标是 * 或者是 @, 替换的值是数组中元素的个数。

```
${parameter#word}
${parameter##word}
```

word   被扩展为一个模式，就像路径扩展中一样。如果这个模式匹配   parameter  的值的起始，那么扩展的结果是将  parameter  扩展后的值中，最短的匹配  (`#`  的情况)  或者最长的匹配(`##`的情况) 删除的结果。如果 parameter 是 @ 或者是  *,  则模式删除操作将依次施用于每个位置参数，最后扩展为结果的列表。如果  parameter  是一个数组变量，下标是  @  或者是  *,
模式删除将依次施用于数组中的每个成员，最后扩展为结果的列表。

```
${parameter%word}
${parameter%%word}
```

word  被扩展为一个模式，就像路径扩展中一样。如果这个模式匹配  parameter  扩展后的值的尾部，那么扩展的结果是将  parameter 扩展后的值中，最短的匹配 (`%` 的情况) 或者最长的匹配(`%%`的情况) 删除的结果。如果 parameter 是 @ 或者是  *,  则模式删除操作将依次施用于每个位置参数，最后扩展为结果的列表。如果  parameter  是一个数组变量，下标是  @  或者是  *,模式删除将依次施用于数组中的每个成员，最后扩展为结果的列表。

```
${parameter/pattern/string}
${parameter//pattern/string}
```

patterm  被扩展为一个模式，就像路径扩展中一样。parameter  被扩展，其值中最长的匹配 pattern 的内容被替换为 string。 在第一种形式中，只有第一个匹配被替换。第二种形式使得 pattern
中所有匹配都被替换为 string。 如果 pattern 以 #  开始，它必须匹配  parameter  扩展后  值的首部。如果  pattern  以  %  开始，它必须匹配  parameter  扩展后值的尾部。如果 string 是空值，pattern  的匹配都将被删除，  pattern  之后的  /  将被忽略。如果  parameter  是  @  或者是  *,  则替换操作将依次施用于每个位置参数，最后扩展为结果的列表。如果 parameter是一个数组变量，下标是 @ 或者是 *, 模式删除将依次施用于数组中的每个成员，最后扩展为结果的列表。

## command substitution (命令替换)


命令替换 (Command substitution) 允许以命令的输出替换命令名。有两种形式：

```
$(command)
```

    还有

```
`command`
```

Bash 进行扩展的步骤是执行 command，以它的标准输出替换它，并且将所有后续的新行符删除。内嵌的新行符不会删除，但是它们可能会在词的拆分中被删除。命令替换`$(cat file)`可以用等价但是更快的方法 `$(< file)` 代替。

当使用旧式的反引号\`替换形式时，反斜杠只有其字面意义，除非后面是$,\`,或者是\\.第一个前面没有反斜杠的反引号将结束命令替换。当使用$(command)形式时，括号中所有字符组成了整个命令；没有被特殊处理的字符。

命令替换可以嵌套。要在使用反引号形式时嵌套，可以用反斜杠来转义内层的反引号。

如果替换发生在双引号之中，结果将不进行词的拆分和路径扩展。

## arithmetic expansion (算数扩展)

算术扩展允许算术表达式的求值和结果的替换。算术扩展的格式是：

```
$((expression))
```

表达式 expression 被视为如同在双引号之中一样，但是括号中的双引号不会被特殊处理。 表达式中所有词都经过了参数扩展，字符串扩展，命令替换和引用的删除。 算术替换可以嵌套。

## word splitting (词的拆分)

shell 检测不在双引号引用中发生的参数扩展，命令替换和算术扩展的结果，进行 word splitting(词的拆分)。

shell 将 IFS 的每个字符都作为定界符，根据这些字符来将其他扩展的结果分成词。如果 IFS 没有定义，或者它的值是默认的 <space><tab><newline>, 那么 IFS  字符的任何序列都将作为分界之用。如果 IFS 的值是默认之外的值，那么词开头和结尾的空白字符   space 和 tab 都将被忽略，只要空白字符在 IFS 的值之内 (即，IFS 包含空白字符)。任何在 IFS  之中但是不是 IFS 空白的字符，以及任何相邻的 IFS 空白字符，将字段分隔开来。 IFS 空白字符的序列也被作为分界符。如果 IFS 的值是空，不会发生词的拆分。

显式给出的空值参数 ("" 或 '') 将被保留。 隐含的空值参数，来自于空值的参数扩展，如果没有引用则将被删除。 如果空值的参数在双引号引用中扩展，结果是空值的参数，将被保留。

注意如果没有发生扩展，不会进行词的拆分。

## pathname expansion (路径扩展)

词的拆分之后，除非设置过 -f 选项，bash 搜索每个词，寻找字符 *, ?, 和 [. 如果找到了其中之一，那么这个词被当作一个 pattern(模式)，被替换为匹配这个模式的文件名以字母顺序排列的列表。如果没有找到匹配的文件名， 并且 shell 禁用了 nullglob 选项，这个词将不发生变化。如果设置了 nullglob 选项并且没有找到匹配，这个词将被删除。如果启用了 nocaseglob 选项，匹配时将不考虑字母的大小写。当模式用作路径名扩展时，字符 '.'如果在一个名称的开始或者紧随一个斜杠之后，那么它必须被显式地匹配，除非设置了 dotglob      shell 选项。当匹配一个路径名时，斜杠符必须被显式地匹配。其他情况下，字符 '.'不会被特殊对待。

环境变量 GLOBIGNORE 可以用来限制匹配 pattern 的文件名集合。如果设置了 GLOBIGNORE，总是被忽略，即使设置了 GLOBIGNORE。开头的文件名)，可以将 ``.*''  添加为 GLOBIGNORE 的模式之一。选项 dotglob 被禁用，如果 GLOBIGNORE 没有定义时。

Pattern Matching

任何模式中出现的字符，除了下面描述的特殊模式字符外，都匹配它本身。 模式中不能出现 NUL 字符。如果要匹配字面上的特殊模式字符，它必须被引用。

特殊模式字符有下述意义：

`*`   匹配任何字符串包含空串。

`?`  匹配任何单个字符。

`[...]` 匹配所包含的任何字符之一。用一个连字符(`-`)分隔的一对字符意思是一个range expression (范围表达式)；任何排在它们之间的字符，包含它们，都被匹配。排序使用当前语言环境的字符顺序和字符集。如果 [ 之后的第一个字符是一个 ! 或是一个 ^ 那么任何不包含在内的字符将被匹配。范围表达式中字符的顺序是由当前语言环境和环境变量LC_COLLATE 的值 (如果设置了的话) 决定的。一个 - 只有作为集合中第一个或最后一个字符时才能被匹配。一个 ] 只有是集合中第一个字符时才能被匹配。

在 [ 和 ] 中，character classes (字符类) 可以用 [:class:] 这样的语法来指定，这里 class 是在 POSIX.2 标准中定义的下列类名之一:
alnum alpha ascii blank cntrl digit graph lower print punct space upper word xdigit
一个字符类匹配任何属于这一类的字符。word 字符类匹配字母，数字和字符 _。

在 [ 和 ] 中，可以用 [=c=] 这样的语法来指定 equivalence class (等价类)。它匹配与字符 c 有相同归并权值 (collation weight，由当前 语言环境定义) 的字符。

在 [ 和 ] 中，语法 [.symbol.] 匹配归并符号 (collating symbol) symbol。

如果使用内建命令 shopt 启用了 shell 选项  extglob，  将识别另外几种模式匹配操作符。下面的描述中，pattern-list  是一个  或多个模式以  |  分隔的列表。复合的模式可以使用一个或多个下列的

子模式构造出来：

```
?(pattern-list)
```

匹配所给模式零次或一次出现


```
*(pattern-list)
```

匹配所给模式零次或多次出现

```
+(pattern-list)
```

匹配所给模式一次或多次出现

```
@(pattern-list)
```

准确匹配所给模式之一

```
!(pattern-list)
```
任何除了匹配所给模式之一的字串
