+++
title = "Standard I/O"
date = 2019-08-23T09:29:15+08:00
draft = false
tags = ["library"]
categories = ["c"]
+++

# c 常用标准输入输出

在 c 程序中，常使用标准 I/O 库(stdio)中的方法来实现输入输出操作。这些方法是高层次的输入输出，因为他们有三个重要的功能:

* 缓冲区自动操作。相对于一次写入几个字节数据，这些方法实际上一次可以写入一大块数据，通常有数千个字节。缓冲区的大小在 `stdio.h` 的常量 `BUFSIZ` 定义。

* 输入和输出的转换。例如当使用 `printf` 来打印一个整数(用 `%d` 控制)，代表那个整数的字符将会被打印。相似的，当使用 `scanf`，代表那个数字的字符被转换成数值。

* 输入和输出自动格式化。你可以指定宽度以及其他任何格式来打印数字和字符串。

## 文件指针

在标准 I/O 库中，一个文件被称为一个流(stream)，用一个指向 `FILE` 类型的对象指针来描述，叫做文件指针(`file pointer`)。`FILE` 文件类型在 `stdio.h` 中定义。有三个预先定义好的文件指针：`stdin`，`stdout`，`stderr`，分别代表标准输入（键盘），标准输出（终端屏幕），和标准错误输出。

大多数标准输入输出库中的函数需要一个文件指针代表一个打开的流作为参数。当从标准输入读取数据或输出到标准输出时，标准 I/O 库提供了一些速记函数来指定这些流而无需再传递参数。下表指明了这些速记函数和他们的等价函数:

| Shorthand      | Equivalent                             |
| :---           | :---                                   |
| `getchar()`    | `fgetc(stdin)`, `getc(stdin)`          |
| `gets(buf)`    | `fgets(buf, BUFSIZ, stdin)`            |
| `printf(args)` | `fprintf(stdout, args)`                |
| `putchar(c)`   | `fputc(c, stdout)`, `putc(c, stdout)`  |
| `puts(buf)`    | `fputs(buf, stdout)`                   |
| `scanf(args)`  | `fscanf(stdin, args)`                  |

## 打开和创建文件

为了能够从文件读或写入文件，那个文件必须被打开用于读写。`fopen` 函数就是用于这个目的。这个函数读取两个参数：一个字符串代表文件名，一个字符串用于描述文件被怎样打开。它返回一个打开的 `FILE` 文件流，或者如果无法打开指定文件时会返回常量 `NULL`。`fopen` 的第二个参数可以是以下值：

* `r`: 文件会以只读模式打开。文件必须存在且有读的权限。
* `w`: 文件会以只写模式打开。如果文件不存在，会创建一个空文件。如果文件已存在，文件原有内容会被清空。
* `a`: 文件会以只写模式打开。如果文件不存在，会创建一个空文件。如果文件已存在，文件原有内容不会被清空。新写的数据会追加到文件末尾。

另外，一个加号 `+` 可以添加到上述值的后面，表示文件以可读可写的模式打开。`r+` 需要文件已存在，不会清空数据。`w+` 和 `a+` 会创建文件如果文件不存在。

## 关闭文件

`fclose` 函数用于关闭文件流，它读取一个参数，文件指针指向的流会被关闭。当调用这个函数时，流的缓冲区会被刷新，还会执行一些内部的清理函数。如果成功会返回0；如果有错误发生会返回常量 `EOF`。

## 读写文件

标准 I/O 库提供了一些列方法用于在文件中读写文件。

### getc 和 putc

最简单的读写数据的方法是一次读写一个字符(也是一个字节)。这个可以用 `getc` 和 `putc` 来实现。`getc` 只需要一个参数，指向用于读取的打开流的文件指针。它返回从流中读取的下一个字符或当到达文件末尾则返回常量 `EOF`。`putc` 接受两个参数，一个写入的字符和一个指向用于写入的打开流的文件指针。它把字符放到流中，如果成功返回0，如果有错误，返回常量 `EOF`。

要注意的是，虽然 `getc` 和 `putc` 一次只操作一个字符，但并不是每次调用都会下发到系统进行磁盘读写，而是会将这些字符存储到缓冲区，然后一次性写入几千个字符到磁盘中。所以即使处理大文件效率也很高。

<details>
<summary>code</summary>

```c
#include <stdio.h>
int main(int argc, char *argv[]) {
    int c;
    FILE *from, *to;

    if(argc != 3) {
        fprintf(stderr, "Usage: %s from-file to-file\n", *argv);
        return 1;
    }

    if((from = fopen(argv[1], "r")) == NULL) {
        perror(argv[1]);
        return 1;
    }

    if((to = fopen(argv[2], "a")) == NULL) {
        perror(argv[2]);
        return 1;
    }

    while((c=getc(from)) != EOF)
        putc(c, to);

    fclose(from);
    fclose(to);
    return 0;
}
```
</details>

这个程序违反了一个重要的 UNIX 习惯，程序应该可以同时处理命名文件和标准输入输出。文档格式程序 `tbl`，`eqn`，`nroff` 和 `troff` 是很好的例子。给定文件名，程序会打开文件并操作里面的数据。如果没有给定文件名，程序会从标准输入读取数据。这允许程序作为过滤器，它们可独立调用或是称为管道的一部分。

### fgets 和 fputs

标准 I/O 库提供的读写文件的方法允许程序一次操纵一行数据。一行被定义为以换行符号结尾的0个或多个字符。`fgets` 接受三个参数，一个指针指向缓冲区，一个整数指定缓冲区的大小，一个文件指针指向打开的用于读取的流。指向被填充的缓冲区的指针返回成功，或者当到达文件结尾时返回 `NULL`。缓冲区会被一行字符填充，包括换行符号和 `\0`。`fputs` 接受两个参数，一个指向字符串的指针，一个指向打开的可写流的文件指针。如果成功返回0，如果出错，返回常量 `EOF`。

<details>
<summary>code</summary>

```c
#include <stdio.h>
int main(int argc, char *argv[]) {
    FILE *from, *to;
    char line[BUFSIZ];

    if(argc != 3) {
        fprintf(stderr, "Usage: %s from-file to-file\n", *argv);
        return 1;
    }

    if((from = fopen(argv[1], "r")) == NULL) {
        perror(argv[1]);
        return 1;
    }

    if((to = fopen(argv[2], "a")) == NULL) {
        perror(argv[2]);
        return 1;
    }

    while((fgets(line, BUFSIZ, from)) != NULL)
        fputs(line, to);

    fclose(from);
    fclose(to);
    return 0;
}
```
</details>

### fread 和 fwrite

标准 I/O 库也提供了不将数据拆分的读写方式。这通常用于不是全由字符组成，可能也包含二进制数据的文件。`fread` 接受四个参数，一个指针指向某个数据类型的数组，一个整数表示数组一个元素的大小（字节数），一个整数表示读取元素的个数，一个文件指针指向用于读取的流。函数返回实际读取的元素个数，在到达文件末尾时返回0。`fwrite`接受相同的四个参数，返回写入的元素个数，出错时返回0。

<details>
<summary>code</summary>

```c
#include <stdio.h>
int main(int argc, char *argv[]) {
    int n;
    FILE *from, *to;
    char buf[BUFSIZ];

    if(argc != 3) {
        fprintf(stderr, "Usage: %s from-file to-file\n", *argv);
        return 1;
    }

    if((from = fopen(argv[1], "r")) == NULL) {
        perror(argv[1]);
        return 1;
    }

    if((to = fopen(argv[2], "a")) == NULL) {
        perror(argv[2]);
        return 1;
    }

    while((n=fread(buf, sizeof(char), BUFSIZ, from)) > 0)
        fwrite(buf,sizeof(char), n, to);

    fclose(from);
    fclose(to);
    return 0;
}
```
</details>

### fscanf 和 fprintf

`fscanf` 接受一系列参数。第一个参数是一个指向打开的读取流的文件指针。第二个参数是一个指定输入数据格式的字符串。剩下的参数是指向要被填充对象的指针。它从流中读取字符，并转化为指定格式存储到对象中。`fprintf` 也接受一系列参数。第一个参数是一个指向打开的写入流的文件指针。第二个参数是格式化字符串。剩下的参数是要打印的内容。

下面这个程序要求输入一个数字，然后计算它的阶乘。它使用`printf`和`scanf`，默认指定流是`stdout`和`stdin`，而不需要再指定流作为参数。

<details>
<summary>code</summary>

```c
#include <stdio.h>
int fact(int);
int main(int argc, char *argv[]) {
    int n, m;
    printf("Enter a number: ");
    scanf("%d", &n);
    m = fact(n);
    printf("The factorial of %d is %d.\n", n, m);
    return 0;
}

int fact(int n) {
    if(n==0)
        return 1;
    return (n * fact(n-1));
}
```
</details>

### sscanf 和 sprintf

标准输入输出库也提供了打印格式化数据到字符串和从字符串读取格式化数据的能力。`sscanf`、`sprintf` 和 `fscanf`、`fprintf` 类似，只是它们把文件流换成了字符串。

## 在文件中移动

在读取或写入文件数据之前，将位置移动到合适位置是很有必要的。标准输入输出库中在一个文件中移动的函数是 `fseek`。它接受三个参数：一个文件流指针，一个长整型变量指定移动的字节数，称为偏移量(offset)，一个整数指定偏移量在文件中开始的位置，可以是 `SEEK_SET` 即0代表文件开头，`SEEK_CUR` 即1代表当前位置，`SEEK_END`即2代表文件末尾。移到文件末尾，调用 `fseek(fp, 0L, 2)`，移动到文件开头，调用 `fseek(fp, 0L, 0)` 或者 `rewind(fp)`。下面的代码创建了一个 5 位用户的数据文件。并且是从后往前写入的。

<details>
<summary>code</summary>

```c
#include <stdio.h>
#include <string.h>

typedef struct record {
    int uid;
    char login[8];
}record;

char *logins[] = {"user1", "user2", "user3", "user4", "user5"};

void putrec(FILE *, int, record *);

int main(int argc, char *argv[]) {
    int i;
    FILE *fp;
    record rec;

    if ((fp=fopen("datafile", "w"))==NULL) {
        perror("datafile");
        return 1;
    }

    for (i=4; i>=0; i--) {
        rec.uid=i;
        strcpy(rec.login, logins[i]);
        putrec(fp, i, &rec);
    }
    return 0;
}

void putrec(FILE *fp, int i, record *r) {
    fseek(fp, (long)i*sizeof(struct record), SEEK_SET);
    fwrite(r, sizeof(struct record), 1, fp);
}
```
</details>

下面的代码实现了以 3,0,2,1,4 的顺序读取刚刚创建的用户数据文件。

<details>
<summary>code</summary>

```c
#include <stdio.h>

typedef struct record {
    int uid;
    char login[8];
}record;

int step[]={3, 0, 2, 1, 4};

void readrec(FILE *, int, record *);

int main(int argc, char *argv[]) {
    int i;
    FILE *fp;
    record rec;

    if ((fp=fopen("datafile", "r"))==NULL) {
        perror("datafile");
        return 1;
    }

    for (i=0; i<5; i++) {
        readrec(fp, step[i], &rec);
        printf("%d\t%s\n", rec.uid, rec.login);
    }
    return 0;
}

void readrec(FILE *fp, int i, record *r) {
    fseek(fp, (long)i*sizeof(record), SEEK_SET);
    fread(r, sizeof(record), 1, fp);
}
```
</details>
