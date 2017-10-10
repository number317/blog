---
title: "Bash Tips"
date: 2017-10-10T11:20:29+08:00
draft: false
---


# bash 代码规范建议

Bash 可以认为是系统编程级的 JavaScript。虽然在某些时候，使用一门像 C，Go 之类的系统语言是一个更好的选择，但是对于一些小的POSIX相关或命令行任务，Bash 是一门理想的系统语言。这里有三个原因：

* Bash 无处不在。就像 web 上的 JavaScript，Bash 早就在系统上为系统编程准备好了。
* Bash 是中立的。不像 Ruby，Python，JavaScript 或者 PHP，Bash 在所有社区都被一致对待。
* Bash 可以作为粘合剂。用 C 或 Go （或者其他任意语言）来编写复杂的部分，然后用 Bash 将它们粘合在一起。

<!--more-->

这篇文章记录了一些 Bash 脚本的代码规范。这些规范基于大量的经验和时间收集的最佳实践。大部分来自于两篇文章，[http://wiki.bash-hackers.org/scripting/obsolete](http://wiki.bash-hackers.org/scripting/obsolete)和[http://www.kfirlavi.com/blog/2012/11/14/defensive-bash-programming/](http://www.kfirlavi.com/blog/2012/11/14/defensive-bash-programming/)，这里将他们整合在了一起，做了少量的修改，添加了一些新的内容。

注意这篇文章不是针对 shell 脚本写的，这些规则只针对 Bash 脚本。

## 大规则

* 使用双引号，包括子 shell，不要使用裸露的 `$`。
    * 这条规则可以让你走得更远。阅读[http://mywiki.wooledge.org/Quotes](http://mywiki.wooledge.org/Quotes)查看更多细节。
* 所有的代码都写入一个函数中，哪怕只有一个函数`main`。
    * 除非该脚本是用作库文件，否则你可以编写‘main’函数并且调用它。
    * 避免使用全局变量。定义常量时使用`readonly`。
* 在可执行脚本中使用`main`函数，用`main`或者`main "$@"`来调用。
    * 如果脚本也是可以作为库文件使用的，用`[[ "$0" == "$BASH_SOURCE" ]] && main "$@"`。
* 使用`local`来定义变量，除了有另外的原因使用`declare`。
    * 除了有罕见的情况你特意在范围外设置变量。
* 变量名应该设置为小写，除非导出为环境变量。
* 使用`set -eo pipefail`。快速失败并注意退出状态码。
    * 在程序中使用`|| true`如果你有意要以非0值退出
* 不要使用已弃用的语法。尤其是以下几点：
    * 定义函数用`myfunc() { ... }`，而不是`function myfunc { ... }`。
    * 使用`[[`代替`[`或`test`。
    * 不要使用倒引号，使用`$( ... )`。
    * 查看[http://wiki.bash-hackers.org/scripting/obsolete](http://wiki.bash-hackers.org/scripting/obsolete)获取更多详细信息。
* 尽量使用绝对路径，使用相对路径时，加上`./`。
* 使用`declare`并且命名变量参数在超过2行的函数顶部。
    * 例如：`declare arg1="$1" arg2="$2"`。
    * 例外是定义可变参数函数，见下。
* 为临时文件使用`mktemp`，用`trap`来清理。
* 警告和错误应该输出到STDERR，任何与之相对的东西都应该输出倒STDOUT。
* 尝试去本地化`shopt`的使用并且在结束时禁用选项。

如果你知道你在做什么，你可以打破这些规则，但通常来说，这些规则是对的并且非常有用。

## 最佳练习和提示

 * 如果可以的话，在awk/sed之前使用Bash变量替换。
 * 尽量使用双括号除非使用单括号更有意义。
 * 对于简单的条件判断，请使用`&&`和`||`。
 * 不要害怕使用`printf`，它比`echo`更加强大。
 * 把`then`，`do`等放在同一行，而不是换一行。
 * Skip `[[ ... ]]` in your if-expression if you can test for exit code instead.
 * 如果可以测试退出代码，在你的if表达式中跳过`[[ ... ]]`。
 * 使用`.sh`或`.bash`扩展名如果一个文件要被用于included/sourced。不要在可执行脚本中使用。
 * 把复杂的`sed`，`perl`等代码放在一个名字有意义的函数下。
 * 脚本中包含`[[ "$TRACE" ]] && set -x`是一个好习惯。
 * 脚本的设计应该遵循简单和易于使用的原则。
    * 避免选项标记和解析，尝试使用可选的环境变量来代替。
    * 对于必要的不同模式使用子命令。
 * 在大系统或任何CLI命令，为功能添加一个描述。
    * 在函数的最上方使用`declare desc="description"`，即使是在参数声明之前。
    * 这可以用一个利用反射的简单函数来查询/提取。
 * 要注意可移植性。在容器中运行Bash可以比在多个平台上运行的Bash做更多的假设。
 * 当预期或导出环境时，考虑在可能涉及子shell时使用命名空间变量。
 
## 有用的参考和帮助

 * [http://wiki.bash-hackers.org/scripting/start](http://wiki.bash-hackers.org/scripting/start)
   * 尤其是 [http://wiki.bash-hackers.org/scripting/newbie_traps](http://wiki.bash-hackers.org/scripting/newbie_traps)
 * [http://tldp.org/LDP/abs/html/](http://tldp.org/LDP/abs/html/)
 * 交互式Bash的提示: [http://samrowe.com/wordpress/advancing-in-the-bash-shell/](http://samrowe.com/wordpress/advancing-in-the-bash-shell/)
 * 用于参考, [Google's Bash styleguide](http://google-styleguide.googlecode.com/svn/trunk/shell.xml)
 * [shellcheck](https://github.com/koalaman/shellcheck)

## 例子

### 带有命名参数的常规函数

带有参数的函数定义：

```bash
regular_func() {
	declare arg1="$1" arg2="$2" arg3="$3"

	# ...
}
```

### 可变参数函数

带有最后可变参数的函数定义：

```bash
variadic_func() {
	local arg1="$1"; shift
	local arg2="$1"; shift
	local rest="$@"

	# ...
}
```

### 条件语句: 测试退出码 vs 输出

```bash
# Test for exit code (-q mutes output)
if grep -q 'foo' somefile; then
  ...
fi

# Test for output (-m1 limits to one result)
if [[ "$(grep -m1 'foo' somefile)" ]]; then
  ...
fi
```
