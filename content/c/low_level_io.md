+++
title = "Low Level I/O"
date = 2019-08-27T09:07:47+08:00
draft = false
tags = ["library"]
categories = ["c"]
+++

# 底层 I/O

任务由标准 I/O 库函数执行，即缓冲和输入/输出转换，不总是可取的。例如，直接和诸如磁带驱动器之类的设备执行输入和输出时，程序员需要能够确定缓冲区要使用的大小，而不是让 stdio 的函数执行它。当然，系统提供这一层级的控制。标准 I/O 库是底层 I/O 库的一个用户友好的接口。

## 文件描述符

在标准 I/O 中，文件由文件指针引用。使用底层接口时，文件由文件描述符引用，由一个简单的整数来指代。在标准 I/O 中，有三个预先定义的文件描述符，0,1,2，分别指向标准输入，标准输出和标准错误输出。

不同于标准 I/O 库，为标准输入输出提供了速记函数，所有的底层 I/O 函数需要一个合适的文件描述符传递给它们。

## 打开和创建文件

`open` 函数用于打开一个文件用于读写或创建。它接收三个参数：要打开文件名的字符串，一个整数指定文件的打开方式，一个整数 `mode` 当创建一个文件。成功时，它返回一个整数的文件描述符，失败时返回 -1。第二个参数在 `sys/file.h`(Berkeley) 或 `sys/fcntl.h`(System V)中定义如下：

* `O_RDONLY`    只读模式
* `O_WRONLY`    只写模式
* `O_RDWR`      读写模式
* `O_APPEND`    追加模式
* `O_CREAT`     创建文件如果不存在，这个模式应该给出第三个参数
* `O_TRUNC`     截断文件长度为0用于写
* `O_EXCL`      返回错误如果创建文件时文件存在
* `O_NDELAY`    打开文件时不阻塞

## 关闭文件

`close` 函数用于关闭文件，只接收一个参数，引用于要关闭文件的文件描述符。成功时返回0；出错时返回-1。

## 读写文件

在底层接口中读写文件只有一个办法，一次一个缓冲区。缓冲区大小留给程序员定义，需要确定一个合适的值。例如，如果一个程序一侧值读写一个字符而不是几千个字符，操作系统将为每个字符都访问一次硬盘（或其他设备），导致程序执行非常缓慢。

`read` 系统调用接收三个参数：一个文件描述符用于读取，一个指针指向缓冲区等待填写数据，一个整数表示要读取的字节数。返回实际读取的字节数，或者出错时返回 -1，到达文件末尾时返回 0。

`write` 系统调用接收三个参数：一个文件描述符用于写入，一个指针指向缓冲区存放要写的数据，一个整数表示要写入的字节数。返回实际写入的字节数，或者出错时返回 -1。

下面的代码实现了文件追加的功能：

<details>
<summary>code</summary>

```c
#include <unistd.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
int main(int argc, char *argv[]) {
    int n;
    int from, to;
    char buf[1024];
    if(argc!=3) {
        write(2, "Usage: ", 7);
        write(2, *argv, strlen(*argv));
        write(2, "from-file to-file\n", 19);
        return 1;
    }

    if ((from=open(argv[1], O_RDONLY))<0) {
        perror(argv[1]);
        return 1;
    }

    if((to=open(argv[2], O_WRONLY|O_CREAT|O_APPEND, 0644))<0) {
        perror(argv[2]);
        return 1;
    }

    while (( n = read(from, buf, sizeof(buf)))>0)
        write(to, buf, n);
    close(from);
    close(to);
    return 0;
}
```
</details>

## 在文件中移动

底层 I/O 库中在文件中移动调用 `lseek` 函数。就像 `fseek`，它接收三个参数：一个文件描述符指向一个打开的文件，一个长整型指定移动的字节数，称为偏移量，一个整型指定偏移量的起始位置。`L_SET`，即 0，设置为文件起始位置；`L_INCR`，即 1，设置为文件当前位置；`L_XTND`，即 2，设置为文件末尾位置。`lseek` 返回新的相对于文件起始的偏移量。要移动到文件末尾，调用 `lseek(fd, 0L, L_XTND)`。要移动到文件开头，调用 `lseek(fd, 0L, L_SET)`。

<details>
<summary>code</summary>

```c
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

typedef struct record {
    int uid;
    char login[8];
}record;

char *logins[]={"user1", "user2", "user3", "user4", "user5"};

void putrec(int, int, record *);

int main(int argc, char *argv[]) {
    int i, fd;
    record rec;
    if ((fd=open("datafile", O_WRONLY | O_CREAT, 0644)) < 0) {
        perror("datafile");
        return 1;
    }

    for (i=4; i>=0; i--) {
        rec.uid=i;
        strcpy(rec.login, logins[i]);
        putrec(fd, i, &rec);
    }
    close(fd);
    return 0;
}

void putrec(int fd, int i, record *rec) {
    lseek(fd, (long)i*sizeof(record), L_SET);
    write(fd, rec, sizeof(record));
}
```
</details>

下面的代码实现了以 3,0,2,1,4 的顺序读取刚刚创建的用户数据文件。

<details>
<summary>code</summary>

```c
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>

typedef struct record {
    int uid;
    char login[8];
}record;

int step[]={3, 0, 2, 1, 4};

void readrec(int, int, record *);

int main(int argc, char *argv[]) {
    int i, fd;
    record rec;
    if ((fd=open("datafile", O_RDONLY)) < 0) {
        perror("datafile");
        return 1;
    }

    for (i=0; i<5; i++) {
        readrec(fd, step[i], &rec);
        printf("%d\t%s\n", rec.uid, rec.login);
    }
    close(fd);
    return 0;
}

void readrec(int fd, int i, record *rec) {
    lseek(fd, (long)i*sizeof(record), L_SET);
    read(fd, rec, sizeof(record));
}
```
</details>

## 重复文件描述符

我们偶尔需要超过一个文件描述符来指向同一个文件。这在另起新的进程时很常见。要生成一个和原来的 fd 指向同一个文件的新文件描述符，可以调用 `fd2=dup(fd)`。`fd2` 会和 `fd` 指向同一个文件并拥有相同的偏移量。如果调用失败，则返回 -1。

另一种调用方式允许程序员选择哪个文件描述符。例如，假设标准输入应该被连接到一个被`fd`引用的硬盘文件（这在 shell 中用 `<` 来处理重定向），我们可以调用 `dup2(fd, 0)`。这将会使文件描述符 0 关闭如果它正在被使用，然后连接到 `fd` 指向的文件。

一个在 UNIX 源代码中很常见的代码块看起来像这样：

```c
close(0);
dup(fd);
```

这里 `dup` 的返回值被忽略了。实际上，这里依赖了 UNIX 系统的特性，最小的可用文件描述符总是最新被分配。

## 将文件描述符转化为文件指针

`fdopen` 接收两个参数：一个文件描述符指向一个文件，一个字符串表明文件描述符被怎样使用。第二个参数和 `fopen` 一样。`fdopen` 返回一个文件指针，它的流和我文件描述符指向同一个文件，当失败时返回 `NULL`。
