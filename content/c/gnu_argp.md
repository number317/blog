+++
title = "GNU Argp"
date = 2019-11-28T15:21:52+08:00
draft = false
tags = ["library"]
categories = ["c"]
+++


# Table of Contents

1.  [GNU Argp 库](#orgf0e1379)
    1.  [前置知识](#org6fa1bce)
        1.  [从一个示例开始](#orgf42580e)
        2.  [命令行参数](#orga9d2bce)
        3.  [选项的参数](#org144682a)
    2.  [step0: 第一个 argp 程序](#orgc1b6978)
    3.  [step1: 短选项](#org70eafff)
    4.  [step2: 选项参数](#org3c9614a)
    5.  [step3: 长选项](#org8db280e)
    6.  [step4: 可选项](#org8f96afa)
    7.  [step5: 别名](#org0a21b14)
    8.  [step6: 回调自身](#orgd308194)
    9.  [step7: 参数支持](#org52a058b)
    10. [step8: 隐藏选项](#org33cd469)
    11. [step9: 完善说明](#orgf7ccfab)
    12. [step10: 选项组](#orgecf76ad)
    13. [step11: 调用库](#org2a29412)


<a id="orgf0e1379"></a>

# GNU Argp 库

c 命令行程序中的参数处理是很常见的需求，要做到这点我们可以用 GNU 的标准库 argp，大部分 GNU 组件都用这个库来解析参数。


<a id="org6fa1bce"></a>

## 前置知识


<a id="orgf42580e"></a>

### 从一个示例开始

先来看一个例子:

<details>
<summary> `sum --help` </summary>

    sum --help
    Usage: sum [OPTION]... [FILE]...
    Print checksum and block counts for each FILE.
    
    With no FILE, or when FILE is -, read standard input.
    
      -r              use BSD sum algorithm, use 1K blocks
      -s, --sysv      use System V sum algorithm, use 512 bytes blocks
          --help     display this help and exit
          --version  output version information and exit
    
    GNU coreutils online help: <https://www.gnu.org/software/coreutils/>
    Full documentation <https://www.gnu.org/software/coreutils/sum>
    or available locally via: info '(coreutils) sum invocation'

</details>

这是一个调用 `--help` 选项常见的输出。受到 BNF 影响， `[]` 意味着是可选的项， `...` 意味着是可重复的项。因此上面的输出意味着 `sum` 命令可以有 0 个或多个选项，可以有 0 个或多个文件。


<a id="orga9d2bce"></a>

### 命令行参数

大多数命令行程序可以有参数(arguments)和选项(options)。参数可以是文件名，就像在 `cp` 命令中看到的:

    cp -v foo bar

有些时候，一个参数看起来很像一个选项。例如，你可能有一个目录，名为 `--foo` ，现在你想要删除它。运行 `rmdir --foo` 将会导致 `rmdir` 程序报告没有 `--foo` 选项的错误。因为这个参数是无法和长选项区分的，我们需要为程序提供一个指示说明我们提供的是参数而不是选项。要做到这点，我们可以使用 `--` 来告诉程序不再有更多的参数提供给程序:

    mkdir --foo
    mkdir: unrecognized option '--foo'
    Try 'mkdir --help' for more information.
    
    mkdir -- --foo
    
    rmdir --foo
    rmdir: unrecognized option '--foo'
    Try 'rmdir --help' for more information.
    
    rmdir -- --foo

`--` 的使用在 argp 库中是默认的处理行为。


<a id="org144682a"></a>

### 选项的参数

和程序一样，选项（通常是长选项）也可以有参数。参数可以是强制参数，可选参数，或者没有参数:

<details>
<summary> `fold --help` </summary>

    fold --help
    Usage: fold [OPTION]... [FILE]...
    Wrap input lines in each FILE, writing to standard output.
    
    With no FILE, or when FILE is -, read standard input.
    
    Mandatory arguments to long options are mandatory for short options too.
      -b, --bytes         count bytes rather than columns
      -s, --spaces        break at spaces
      -w, --width=WIDTH   use WIDTH columns instead of 80
          --help     display this help and exit
          --version  output version information and exit
    
    GNU coreutils online help: <https://www.gnu.org/software/coreutils/>
    Full documentation <https://www.gnu.org/software/coreutils/fold>
    or available locally via: info '(coreutils) fold invocation'

</details>

可以看到 `--width` 选项需要一个数字作为参数。使用 `--width` 选项而不提供参数是错误的，可以有多种方式为 `--width` 选项提供参数:

<details>
<summary> run </summary>

    echo "hello there" | fold -w3
    hel
    lo 
    the
    re
    
    echo "hello there" | fold -w 4
    hell
    o th
    ere
    
    echo "hello there" | fold --width 5
    hello
     ther
    e
    
    echo "hello there" | fold --width=6
    hello 
    there

</details>

带参数的短选项是值得注意的，这不怎么常见，一个例子是 GNU Make 的 `-j` 参数:

    -j [N], --jobs[=N]          Allow N jobs at once; infinite jobs with no arg.
    -k, --keep-going            Keep going when some targets can't be made.

需要值得注意的地方是这种类型的选项可以和 `-k` 一起使用，但不能是 `-k` 在 `-j` 之后。即 make -kj 可以正常工作，但 make -jk 不能。因为这里的 k 被认为是 -j 的参数，而 k 作为 j 的参数是不合法的，它明显不是个数字。


<a id="orgc1b6978"></a>

## step0: 第一个 argp 程序

step0.c:

    #include <argp.h>
    
    int main(int argc, char **argv) {
      return argp_parse(0, argc, argv, 0, 0, 0);
    }

<details>
<summary>编译运行</summary>

    make step0
    
    ./step0 --help
    Usage: step0 [OPTION...]
    
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step0 --usage
    Usage: step0 [-?] [--help] [--usage]
    
    ./step0 foo
    step0: Too many arguments
    Try `step0 --help' or `step0 --usage' for more information.
    
    ./step0 --us
    Usage: step0 [-?] [--help] [--usage]
    
    ./step0 --foo
    ./step0: unrecognized option '--foo'
    Try `step0 --help' or `step0 --usage' for more information.
    
    ./step0 --usage --help
    Usage: step0 [-?] [--help] [--usage]

</details>

通过测试证明以下几件事:

1.  argp 自动做了一些错误处理，默认不允许任何参数
2.  我们可以使用 `-us` 代替 `--usage` 并且效果相同
3.  对于系统不识别的选项做了错误处理

4）用 `--` 说明命令行的选项结束


<a id="org70eafff"></a>

## step1: 短选项

为之前的程序添加一个 `-d` 选项，是程序在屏幕上打印一个 `.` :

<detail>
<summary> `step1.c` </summary>

    #include <argp.h>
    #include <stdio.h>
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
      switch(key) {
      case 'd':
        printf(".\n");
        break;
      }
      return 0;
    }
    
    int main(int argc, char **argv) {
      struct argp_option options[] =
        {
         { 0, 'd', 0, 0, "show a dot on the screen"},
         { 0 }
        };
      struct argp argp = { options, parse_opt };
      return argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

`argp_option` 结构体有 5 个字段，为 0 的表示没有用到，第二个字段 `-d` 表示短选项，第五个字段包含在 `--help` 选项中显示的描述。
在 argp 中最重要的数据类型是 `struct argp` 。这里可以看到它包含:

1.  所有的选项（现在只有一个）
2.  一个指向 argp 用于解析选项的函数的指针（ `parse_opt` ）

注意到 `parse_opt` 是一个回调函数，在代码中没有被显示地调用，而是被传递给了 `struct argp` 作为参数，这里实际是把指向函数所在地址的指针传递给了 `struct argp` ，这与数组名指向数组的第一个元素类似，如果查看 argp 的源码可以看到 `parse_opt` 被重复地调用来处理每一个选项和参数。

<details>
<summary>编译运行</summary>

    make step1
    
    ./step1 --help
    Usage: step1 [OPTION...]
    
      -d                         show a dot on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step1 -d
    .
    
    ./step1 -ddd -d
    .
    .
    .
    .

</details>


<a id="org3c9614a"></a>

## step2: 选项参数

现在为 `-d` 选项添加一个参数，好让程序输出更多的 `.` 而不是一个。

<details>
<summary> `step2.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd': {
                unsigned int i;
                for(i=0; i<atoi(arg); i++)
                    printf(".");
                printf("\n");
                break;
            }
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] = {
            { 0, 'd', "NUM", 0, "Show some dots on the screen"},
            { 0 }
        };
    
        struct argp argp = { options. parse_opt, 0, 0 };
        return argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

现在用到了 `argp_option` 的第三个字段，这表明 `-d` 选项有一个名为 `NUM` 的参数，这会在 `--help` 和 `--usage` 中显示。如果把这个字段改回 `0` 或 `NULL` ， `-d` 选项会停止接受强制参数。

在 `parse_opt` 回调函数中，使用了 `arg` 参数。它是字符串类型，不能为 `NULL` 因为 argp 不允许没有参数调用 `-d` 。 `arg` 指向没有申请过的内存，尝试去强制释放它不是一个好主意。

<details>
<summary>编译运行</summary>

    make step2
    
    ./step2 --help
    Usage: step2 [OPTION...]
    
      -d NUM                     Show some dots on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step2 -d1 -d2 -d 3
    .
    ..
    ...
    
    ./step2 -d
    ./step2: option requires an argument -- 'd'
    Try `step2 --help' or `step2 --usage' for more information.
    
    ./step2 --usage
    Usage: step2 [-?] [-d NUM] [--help] [--usage]

</details>


<a id="org8db280e"></a>

## step3: 长选项

现在为 `-d` 选项添加一个等价的长选项 `--dot` 。

<details>
<summary> `step3.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd': {
                unsigned int i;
                for(i=0; i<atoi(arg); i++)
                    printf(".");
                printf("\n");
                break;
            }
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] = {
            { "dot", 'd', "NUM", 0, "Show some dots on the screen"},
            { 0 }
        };
        struct argp argp = { options, parse_opt, 0, 0 };
        return argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

`struct argp_option` 的第一个字段控制长选项的名字。如果在选项名字中有空格，新行，tab 或不可打印的字符，会报错。

<details>
<summary>编译运行</summary>

    make step3
    
    ./step3 --help
    Usage: step3 [OPTION...]
    
      -d, --dot=NUM              Show some dots on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    Mandatory or optional arguments to long options are also mandatory or optional
    for any corresponding short options.
    
    ./step3 --dot 1 --dot=2 -d3
    .
    ..
    ...
    
    ./step3 --dot
    ./step3: option '--dot' requires an argument
    Try `step3 --help' or `step3 --usage' for more information.
    
    ./step3 --do 12
    ............
    
    ./step3 --usage
    Usage: step3 [-?] [-d NUM] [--dot=NUM] [--help] [--usage]

</details>

现在可以看到 `--help` 信息中有了 `--dot` 选项。在 help 信息底部有一个唠叨的信息，告诉你 `NUM` 也是短选项 `-d` 的参数。可以设置环境变量 `ARGP_HELP_FMT` 的值为 `no-dup-args-note` 来关闭这个信息。

    export ARGP_HELP_FMT="no-dup-args-note"
    
    ./step3 --help
    Usage: step3 [OPTION...]
    
      -d, --dot=NUM              Show some dots on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message


<a id="org8f96afa"></a>

## step4: 可选项

现在将 `--dot` 的 `NUM` 参数设置为可选的。

<details>
<summary> `step4.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd': {
                unsigned int i;
                unsigned int dots = 0;
                if(arg == NULL)
                    dots = 1;
                else
                    dots = atoi(arg);
                for(i=0; i<dots; i++)
                    printf(".");
                printf("\n");
                break;
            }
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] = {
            { "dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen"},
            { 0 }
        };
        struct argp argp = { options, parse_opt, 0, 0 };
        return argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

`struct argp_option` 的第四个字段设置选项如何工作。

<details>
<summary>编译运行</summary>

    make step4
    
    ./step4 --help
    Usage: step4 [OPTION...]
    
      -d, --dot[=NUM]            Show some dots on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step4 --usage
    Usage: step4 [-?] [-d[NUM]] [--dot[=NUM]] [--help] [--usage]
    
    ./step4 -d --dot=3 --dot
    .
    ...
    .
    
    ./step4 --dot 3
    .
    
    ./step4 -dd

</details>

最后两个例子可能不符合预期，这是因为长选项配合可选参数需要一个 `=` 放在选项和参数之间，如果没有，参数会被认为是程序的参数，而不是选项的参数。带有可选参数的短选项不能连起来用。第二个 `d` 被认为是第一个 `d` 的参数， `atoi` 将 `-d` 转换为 `0` 。


<a id="org0a21b14"></a>

## step5: 别名

<details>
<summary> `step5.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd': {
                unsigned int i;
                unsigned int dots = 0;
                if(arg == NULL)
                    dots = 1;
                else
                    dots = atoi(arg);
                for(i = 0; i < dots; i++)
                    printf(".");
                printf("\n");
                break;
            }
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             { "dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen" },
             { "period", 0, "FOO", OPTION_ALIAS, "Bar" },
             { 0 }
            };
        struct argp argp = { options, parse_opt, 0, 0};
        return  argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

`OPTION_ALIAS` 使得选项继承前一个选项的所有字段，除了第一字段长选项名和第二字段短选项名。可以有任意多个别名。一些字段被随意填充了值来阐明它们其实被 argp 忽略了。

<details>
<summary>编译运行</summary>

    make step5
    
    ./step5 --help
    Usage: step5 [OPTION...]
    
      -d, --dot[=NUM], --period[=NUM]
                                 Show some dots on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step5 --usage
    Usage: step5 [-?] [-d[NUM]] [--dot[=NUM]] [--period[=FOO]] [--help] [--usage]
    
    ./step5 --period
    .
    
    ./step5 --period=4
    ....

</details>

可以看到 `FOO` 和 `Bar` 被正确地忽略了，没有在 help 信息中显示出来。新的长选项 `--period` 出现在 `--dot=` 选项旁因为它们是完全等价的。


<a id="orgd308194"></a>

## step6: 回调自身

现在为程序添加一个长选项 `--ellipsis` 用于在屏幕输出 3 个点。功能上等价于 `--dot=3` :

<details>
<summary> `step6.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd': {
                unsigned int i;
                unsigned int dots = 0;
                if(arg == NULL)
                    dots = 1;
                else
                    dots = atoi(arg);
                for(i = 0; i < dots; i++)
                    printf(".");
                printf("\n");
                break;
            }
            case 777:
                return parse_opt('d', "3", state);
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             { "dot", 'd', "NUM", 0, "Show some dots on the screen" },
             { "ellipsis", 777, 0, 0, "Show an ellipsis on the screen" },
             { 0 }
            };
        struct argp argp = { options, parse_opt, 0, 0};
        return  argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

可以看到 `--ellipsis` 选项不接收任何参数，并且有一个奇怪的短选项 `777` 。这是因为 argp 自动检测短选项是否是可打印的字符，由于 `777` 不是一个可打印的字符，意味着 `--ellipsis` 没有对应等价的短选项。

<details>
<summary>编译运行</summary>

    make step6
    
    ./step6 --help
    Usage: step6 [OPTION...]
    
      -d, --dot=NUM              Show some dots on the screen
          --ellipsis             Show an ellipsis on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step6 --usage
    Usage: step6 [-?] [-d NUM] [--dot=NUM] [--ellipsis] [--help] [--usage]
    
    ./step6 --ellipsis
    ...
    
    ./step6 --dot 3
    ...

</details>

由于 `--ellipsis` 没有参数，所以无法为它创建一个别名。


<a id="org52a058b"></a>

## step7: 参数支持

现在为程序添加对一到四个参数的支持。如果程序没有获得足够的参数，将会报错。

<details>
<summary> `step7.c` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        int *arg_count = state->input;
        switch(key) {
            case 'd': {
                unsigned int i;
                unsigned int dots = 0;
                if(arg == NULL)
                    dots = 1;
                else
                    dots = atoi(arg);
                for(i = 0; i < dots; i++)
                    printf(".");
                printf("\n");
                break;
            }
            case 777:
                return parse_opt('d', "3", state);
            case ARGP_KEY_ARG:
                {
                    (*arg_count)--;
                    if(*arg_count >= 0)
                        printf(" %s", arg);
                }
                break;
            case ARGP_KEY_END:
                {
                    printf("\n");
                    if(*arg_count >=4)
                        argp_failure(state, 1, 0, "too few arguments");
                    else if(*arg_count < 0)
                        argp_failure(state, 1, 0, "too many arguments");
                }
                break;
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             { "dot", 'd', "NUM", 0, "Show some dots on the screen" },
             { "ellipsis", 777, 0, 0, "Show an ellipsis on the screen" },
             { 0 }
            };
        int arg_count = 4;
        struct argp argp = { options, parse_opt, "WORD [WORD [WORD [WORD]]]"};
        return  argp_parse(&argp, argc, argv, 0, 0, &arg_count);
    }

</details>

在 argp 接收到参数时，它传递 `ARGP_KEY_ARG` ，当 argp 接收到最后一个参数时，它传递 `ARGP_KEY_END` 到回调函数。

argp 提供了一个函数 `argp_failure` 用于参数解析的错误处理，使用这个函数错误信息会有标准的格式。

`state` 参数展示了 `input` 字段，它存放传递给程序的参数，使用它有两个目的:

1.  知道有多少个参数应该春帝给程序

2）知道有多少个参数传递给程序

argp 也追踪目前为止已经处理了多少个参数，这个信息存放在 `arg_num` 字段中。

代码中也传递了一个指针给 `argp_parse` 作为第 6 个参数。这个参数可以让你传递你想要的数据给回调函数，这通常是一个结构体。

`struct argp` 也拥有比我们想的更多的字段。第三个字段表示在此命令行中期望的参数。在此例中，期望有四个参数，所以这么写。这里将它们称为 `WORD` ，因为这符合句子的构造。

<details>
<summary>编译运行</summary>

    make step7
    
    ./step7 --help
    
    Usage: step7 [OPTION...] WORD [WORD [WORD [WORD]]]
    
      -d, --dot=NUM              Show some dots on the screen
          --ellipsis             Show an ellipsis on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step7 --usage
    Usage: step7 [-?] [-d NUM] [--dot=NUM] [--ellipsis] [--help] [--usage]
                WORD [WORD [WORD [WORD]]]
    
    ./step7 once upon a time
     once upon a time
    
    ./step7 one tow three four five
     one tow three four
    step7: too many arguments

</details>

首先可以看到参数注解被包含在了 help 和 usage 信息中了，并且用户可以给出一到四个单词作为参数，但不能是没有或者大于四个。

当在命令最后带上 `--ellipsis` 长参数时， `...` 会先输出。这是因为 argp 默认行为是先解析选项，再解析参数。如果想要改变，可以向 `argp_parse` 函数的第四个参数传递 `ARGP_IN_ORDER` 。


<a id="org33cd469"></a>

## step8: 隐藏选项

这里要将程序改造成莫尔斯密码的程序，会添加 `--dash` 选项，改造 `--ellipsis` 选项。并且选项在 help 和 usage 信息中被隐藏。程序不再接收任何参数。

<details>
<summary> `step8` </summary>

    #include <stdio.h>
    #include <stdlib.h>
    #include <argp.h>
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd':
                {
                    unsigned int i;
                    unsigned int dots = 1;
                    if(arg != NULL)
                        dots = atoi(arg);
                    for(i=0; i<dots; i++)
                        printf(".");
                    break;
                }
                break;
            case 888:
                printf("-");
                break;
            case 777:
                return parse_opt('d', "3", state);
            case ARGP_KEY_ARG:
                argp_failure(state, 1, 0, "too many arguments");
                break;
            case ARGP_KEY_END:
                printf("\n");
                break;
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             { "dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen" },
             { "ellipsis", 777, 0, OPTION_HIDDEN, "Show an ellipsis on the screen" },
             { "dash", 888, 0, 0, "Show a dash on the screen" },
             { 0 }
            };
        int arg_count = 4;
        struct argp argp = { options, parse_opt};
        return  argp_parse(&argp, argc, argv, 0, 0, 0);
    }

</details>

上述代码中添加了一个长选项 `--dash` ，给 `--dot` 选项一个可选的参数，给了 `--ellipsis` 一个 `OPTION_HIDDEN` 参数。这可以使改选项继续生效，但不会在 help 和 usage 信息中显示。

<details>
<summary>编译运行</summary>

    make step8
    
    ./step8 --help
    Usage: step8 [OPTION...]
    
      -d, --dot[=NUM]            Show some dots on the screen
          --dash                 Show a dash on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
    
    ./step8 --usage
    Usage: step8 [-?] [-d[NUM]] [--dot[=NUM]] [--dash] [--help] [--usage]
    
    ./step8 --ellipsis
    ...
    
    ./step8 -d -d --dot --dash --dash --dash
    ...---
    
    ./step8 --dash --
    -
    
    ./step8 --d
    ./step8: option '--d' is ambiguous; possibilities: '--dot' '--dash'
    Try `step8 --help' or `step8 --usage' for more information.
    
    ./step8 dot
    step8: too many arguments

</details>


<a id="orgf7ccfab"></a>

## step9: 完善说明

<details>
<summary> `step9` </summary>

    #include <stdio.h>
    #include <argp.h>
    #include <argz.h>
    #include <stdlib.h>
    
    const char *argp_program_bug_address = "someone@example.com";
    const char *argp_program_version = "version 1.0";
    
    struct arguments {
        char *argz;
        size_t argz_len;
    };
    
    static int parse_opt(int key, char *arg, struct argp_state *state)
    {
        struct arguments *a = state->input;
        switch(key) {
        case 'd':
            {
                unsigned int dots = 1;
                if(arg != NULL)
                    dots = atoi(arg);
                for(unsigned int i=0; i<dots; i++)
                    printf(".");
                break;
            }
        case 888:
            printf("-");
            break;
        case ARGP_KEY_ARG:
            argz_add(&a->argz, &a->argz_len, arg);
            break;
        case ARGP_KEY_INIT:
            a->argz = 0;
            a->argz_len = 0;
            break;
        case ARGP_KEY_END:
            {
                size_t count = argz_count(a->argz, a->argz_len);
                if(count>2)
                    argp_failure(state, 1, 0, "too many arguments");
                else if(count<1)
                    argp_failure(state, 1, 0, "too few arguments");
            }
            break;
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             {"dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen"},
             {"dash", 888, 0, 0, "Show a dash on the screen"},
             { 0 }
            };
        struct argp argp = {options, parse_opt, "WORD\nWORD WORD",
        "Show some dots and dashes on the screen.\v"
        "A final newline is also shown regardless of whether any options were given."};
        struct arguments arguments;
        if(argp_parse(&argp, argc, argv, 0, 0, &arguments) == 0) {
            const char *prev = NULL;
            char *word;
            while((word = argz_next(arguments.argz, arguments.argz_len, prev))) {
                printf(" %s", word);
                prev = word;
            }
            printf("\n");
            free(arguments.argz);
        }
        return 0;
    }

</details>

如果设置了 `argp_program_version` ，那么长选项 `--version` 和短选项 `-V` 会被包含在程序中。如果设置了 `argp_program_bug_address` ，help 信息将会添加 `Repoprt bugs to: foo@bar..` 的信息。对于程序而言，这是一种良好的风格，告诉用户应用版本，以及如何报告 bug。

在上述代码里也用到了 `argz` 。这是另一个起源与 GNU C 标准库的设施，使用这个库函数来累计程序遇见的参数。结构体 `arguments` 用于存放参数，它将保留参数，并将其设置为 `argp_parse` 函数的输入数据挂钩。 `stdlib.h` 头文件也被引入是因为 argz 向量被分配了内存，需要使用 `free` 来释放内存。

回调函数中的新元素是 `ARGP_KEY_INIT` 。它最先被传到回调函数中在任何解析开始之前。这里用于初始化结构体 `arguments` 。

一个新的 argp 元素是第四个元素，它有特殊的字符 `\v` ，是一个竖向的制表符。在这个制表符之前的所有内容会显示在选项之前，剩下的会在选项之后显示。这个变量的目的有两方面:

1.  给出程序的简短描述

2）更详细地描述程序的选项和操作

另一个新的地方是在 `argp` 结构体中第三个字段（ `args_doc` 字段）的换行符。这是告诉用户有其他运行程序的方式的另一种方法。

<details>
<summary>编译运行</summary>

    make step9
    
    ./step9 --help
    Usage: step9 [OPTION...] WORD
      or:  step9 [OPTION...] WORD WORD
    Show some dots and dashes on the screen.
    
      -d, --dot[=NUM]            Show some dots on the screen
          --dash                 Show a dash on the screen
      -?, --help                 Give this help list
          --usage                Give a short usage message
      -V, --version              Print program version
    
    A final newline is also shown regardless of whether any options were given.
    
    Report bugs to someone@example.com.
    
    ./step9 --usage
    Usage: step9 [-?V] [-d[NUM]] [--dot[=NUM]] [--dash] [--help] [--usage]
                [--version] WORD
      or:  step9 [OPTION...] WORD WORD
    
    ./step9 foo bar
     foo bar
    
    ./step9 foo bar baz
    step9: too many arguments
    
    ./step9
    step9: too few arguments
    
    ./step9 foo --dash -d
    -. foo
    
    ./step9 --version
    version 1.0

</details>

许多命令有许多不同的 usage 行，如 `ln` 命令有 4 种用法。argp 使处理这种情况变得容易。


<a id="orgecf76ad"></a>

## step10: 选项组

将 `--dash` 和 `--dot` 选项放到自己的组中可以使帮助信息的可读性更高。

<details>
<summary> `step10` </summary>

    #include <stdio.h>
    #include <argp.h>
    #include <argz.h>
    #include <stdlib.h>
    
    const char *argp_program_bug_address = "someone@example.com";
    const char *argp_program_version = "version 1.0";
    
    struct arguments {
        char *argz;
        size_t argz_len;
    };
    
    static int parse_opt(int key, char *arg, struct argp_state *state)
    {
        struct arguments *a = state->input;
        switch(key) {
        case 'd':
            {
                unsigned int dots = 1;
                if(arg != NULL)
                    dots = atoi(arg);
                for(unsigned int i=0; i<dots; i++)
                    printf(".");
                break;
            }
        case 888:
            printf("-");
            break;
        case 999:
            parse_opt('d', "3", state);
            printf(" ");
            parse_opt(888, NULL, state);
            parse_opt(888, NULL, state);
            parse_opt(888, NULL, state);
            printf(" ");
            parse_opt('d', "3", state);
            printf("\n");
            exit(0);
            break;
        case ARGP_KEY_ARG:
            argz_add(&a->argz, &a->argz_len, arg);
            break;
        case ARGP_KEY_INIT:
            a->argz = 0;
            a->argz_len = 0;
            break;
        case ARGP_KEY_END:
            {
                size_t count = argz_count(a->argz, a->argz_len);
                if(count>2)
                    argp_failure(state, 1, 0, "too many arguments");
                else if(count<1)
                    argp_failure(state, 1, 0, "too few arguments");
            }
            break;
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
            {
             {0, 0, 0, 0, "Morse Code Options:", 7},
             {"dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen"},
             {"dash", 888, 0, 0, "Show a dash on the screen"},
             {0, 0, 0, 0, "Information Options:", -1},
             {"SOS", 999, 0, 0, "Give some help in morse code"},
             { 0 }
            };
        struct argp argp = {options, parse_opt, "WORD\nWORD WORD",
        "Show some dots and dashes on the screen.\v"
        "A final newline is also shown regardless of whether any options were given."};
        struct arguments arguments;
        if(argp_parse(&argp, argc, argv, 0, 0, &arguments) == 0) {
            const char *prev = NULL;
            char *word;
            while((word = argz_next(arguments.argz, arguments.argz_len, prev))) {
                printf(" %s", word);
                prev = word;
            }
            printf("\n");
            free(arguments.argz);
        }
        return 0;
    }

</details>

结构体 `argp_option` 四条记录中只有两条记录指定了 `group` ，分别是 7 和 -1。这两条记录被称为头，通常的惯例是将其文本以冒号结尾。 `group` 字段被当作在帮助信息中用于排序选项的主键。拥有更大的非负数值的记录会排在更小的非负数值的记录之后。拥有负数值的记录排在非负值记录之后。小的负值记录排在大的负值记录之后。排序方式形如 `0 ,1, 2, ..., n, -m, ..., -2, -1` 。其他记录没有指定 `group` 字段。因为这些字段在头记录之后的记录中会自动设置。所以 `--dot` 和 `--dash` 自动接收到值 7。通常用法是对没有头的选项不设置该值。

组值为零且未出现在选项标题之后的选项将保持其零值，并出现在帮助输出中的所有其他选项之前。 如果我们在选项标题中省略了组值，则会自动将其设置为比前一个选项的组值大一个的值。 自动设置组值的目的是在简单的情况下不必提供组值。

<details>
<summary>编译运行</summary>

    make step10
    
    ./step10 --help
    Usage: step10 [OPTION...] WORD
      or:  step10 [OPTION...] WORD WORD
    Show some dots and dashes on the screen.
    
     Morse Code Options:
      -d, --dot[=NUM]            Show some dots on the screen
          --dash                 Show a dash on the screen
    
     Information Options:
      -?, --help                 Give this help list
          --SOS                  Give some help in morse code
          --usage                Give a short usage message
      -V, --version              Print program version
    
    A final newline is also shown regardless of whether any options were given.
    
    Report bugs to someone@example.com.
    
    ./step10 -SOS
    ... --- ...

</details>

可以看到莫尔斯密码选项都在同一组， `--dot` 选项出现在 `--dash` 选项之前，因为排序的第二个键是短选项，第三个键才是长选项。

`--SOS` 选项也出现在了其他帮助信息中，因为默认选项也有 -1 的组值。


<a id="org2a29412"></a>

## step11: 调用库

可能有两个程序并且希望他们有相同的选项，argp 让这个实现变得简单，不需要复制代码。对于程序员而言，将程序中的函数压缩成一个库好让别的应用使用 api 来构建新应用是一中常见的做法。

<details>
<summary> `dotdash.c` </summary>

    #include "dotdash.h"
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 'd':
            {
                unsigned int dots = 1;
                if(arg != NULL)
                    dots = atoi(arg);
                for(unsigned int i=0; i<dots; i++)
                    printf(".");
                break;
            }
            case 888:
                printf("-");
                break;
        }
        return 0;
    }
    
    static struct argp_option options[] =
    {
        {"dot", 'd', "NUM", OPTION_ARG_OPTIONAL, "Show some dots on the screen"},
        {"dash", 888, 0, 0, "Show a dash on the screen"},
        { 0 }
    };
    
    struct argp dotdash_argp = {options, parse_opt, 0, 0, 0};

</details>

dotdash.h:

    #ifndef DASHDOT_H
    #define DASHDOT_H
    #include <argp.h>
    extern struct argp dotdash_argp;
    #endif

<details>
<summary> `step11.c` </summary>

    #include <stdio.h>
    #include <argp.h>
    #include "dotdash.h"
    
    static int parse_opt(int key, char *arg, struct argp_state *state) {
        switch(key) {
            case 999:
                printf("...---...");
                break;
        }
        return 0;
    }
    
    int main(int argc, char **argv) {
        struct argp_option options[] =
        {
            {"SOS", 999, 0, 0, "Show the SOS sequence on the screen"},
            { 0 }
        };
        struct argp_child children_parsers[] =
        {
            {&dotdash_argp. 0, "Basic Morse Code Options:", 7},
            {0},
        };
        struct argp argp = {options, parse_opt, 0, 0, children_parsers};
        int retval = argp_parse(&argp, argc, argv, 0, 0, 0);
        printf("\n");
        return retval;
    }

</details>

<details>
<summary>编译运行</summary>

    cc -c -o dotdash.o dotdash.c
    
    ar cr libdotdash.a dotdash.o
    
    ranlib libdotdash.a
    
    cc step11.c -L./ -ldotdash -o step11
    
    ./step11 --help
    Usage: step11 [OPTION...]
    
          --SOS                  Show the SOS sequence on the screen
    
     Basic Morse Code Options:
      -d, --dot[=NUM]            Show some dots on the screen
          --dash                 Show a dash on the screen
    
      -?, --help                 Give this help list
          --usage                Give a short usage message

</details>
