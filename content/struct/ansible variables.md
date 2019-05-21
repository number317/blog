+++
title = "Ansible Variables"
date = 2018-05-25T03:06:47Z
draft = false
tags = ["ansible"]
categories = ["struct"]
+++

# ansible 变量

ansible 变量以`[A-Za-z]`开头，可以包含下划线`_`和数字`[0-9]`，标准是全部使用小写字母。在清单(inventory)文件里，变量使用`=`赋值，如：

```ini
foo=bar
```

在剧本(playbook)或变量文件里，变量用`:`赋值，如：

```yaml
foo: bar
```

## Playbook Variables

变量可以在使用`ansible-playbook`时通过命令行参数`--extra-vars`选项传递：

```bash
ansible-playbook example.yml --extra-vars "foo=bar"
```

也可以在参数中传递json，yaml格式的数据，甚至是json和yaml文件，就像`--extra-vars "@even_more_vars.json"`或者`--extra-vars "@even_more_vars.yml"`，但这种方式不建议使用。

变量可以直接在playbook中的`vars`部分定义：

```yaml
---
- hosts: example
  vars:
    foo: bar
  tasks:
    # Prints "Variable 'foo' is set to bar".
    - debug: msg="Variable 'foo' is set to {{ foo }}"
```

变量也可以在单独的文件中定义，然后在playbook中通过`vars_files`引用：

```yaml
# Main playbook file.
- hosts: example
  vars_files:
    - vars.yml
  tasks:
	- debug: msg="Variable 'foo' is set to {{ foo }}"
```

和playbook同目录下的`vars.yml`：

```yaml
# Variables file 'vars.yml' in the same folder as the playbook.
foo: bar
```

需要注意的是，当变量存放在单独的文件中，直接在yaml文件的顶层定义，不需要写`vars`之类的头。

变量可以根据条件导入。例如，对于CentOS服务器有一个变量集(Apache 服务被名名为 `httpd`)，对于Debian服务器有另一组变量(Apache 服务被命名为 `apache2`)，在这个例子中，可以使用可选择的`vars_files`：

```yaml
- hosts: example
  vars_files:
    - [ "apache_{{ ansible_os_family }}.yml", "apache_default.yml" ]
  tasks:
    - service: name={{ apache }} state=running
```

然后在playbook的同一目录添加`apache_CentOS.yml`和`apache_default.yml`。在CentOS文件中定义变量`apache: httpd`，在default文件中定义变量`apache: apache2`。

只要在远程服务器上安装了`facter`或`ohai`，ansible可以读取服务器的系统信息，`ansible_os_family`就是其中一个。如果ansible找不到`ansible_os_family`对应的文件，就会使用第二个选项`apache_default.yml`。所以在Debian或Ubuntu服务器上，ansible将使用`apache2`作为服务名，即使没有`apache_Debian.yml`或`apache_Ubuntu.yml`文件。

## Inventory variables

变量可以通过 ansible inventory 文件添加，可以在host定义的同一行或者是一个组定义之后：

```ini
# Host-specific variables (defined inline).
[washington]
app1.example.com proxy_state=present
app2.example.com proxy_state=absent
# Variables defined for the entire group.
[washington:vars]
cdn_host=washington.static.example.com
api_version=3.0.1
```

如果想要定义许多变量，尤其是用于多个服务器的，inventory文件会变得笨重。事实上，ansible的官方文档建议**不要**用inventory文件来存储变量。建议使用`group_vars`和`host_vars` yaml变量文件。例如，为主机`app1.example.com`定义变量，创建一个空白文件`app1.example.com`，在文件中添加变量：

```yaml
---
foo: bar
baz: qux
```

要为整个`washington`组定义变量，创建一个相似的文件`washington`，可以将这些文件放置在playbook同一目录的`host_vars`和`group_vars`目录。ansible将会先使用在`[host|group]_vars`目录的清单文件定义的变量，然后会使用在playbook目录目录定义的变量。

## Registered Variables

在很多情况下我们需要运行一个命令，然后使用它的返回值，错误输出或标准输出来判断是否执行下一个任务。在这种情况下，ansible 允许使用`register`将输出存储到变量中。例如：

```yaml
- name: "Node: Check list of Node.js apps running."
  command: forever list
  register: forever_list
  changed_when: false

- name: "Node: Start example Node.js app."
  command: forever start {{ node_apps_location }}/app/app.js
  when: "forever_list.stdout.find('{{ node_apps_location}}/app/app.js') == -1"
```

在上述的例子中，使用了Python内建的字符串函数`find`来搜索应用的路径。

## Accessing Variables

简单的变量(在inventory files, playbook, variable files 中定义的变量)可以使用语法`{{ variable }}`来当作任务的一部分。如：

```yaml
- command: /opt/my-app/rebuild {{ my_environment }}
```

当这个命令运行的时候，ansible将会用`my_environment`的内容代替`{{ my_environment }}`，命令的结果会是类似`/opt/my-app/rebuild dev`。

使用到的许多变量会是以列表的形式来构建的。直接使用列表`foo`将不会给你足够的可用信息(除非是ansible用到整个列表，像是`with_items`)。

如果定义一个列表：

```yaml
foo_list:
  - one
  - two
  - three
```

可以用两种语法获取第一个元素：

```yaml
foo[0]
foo|first
```

第一种方法使用标准的python语法，第二种方法使用一个Jinja2提供的简便的过滤器，两种方法是等价的。

对于更大更多的列表(例如获取服务器的IP地址)，可以通过列表的关键字来得到列表的任意位置的内容，使用`[]`或`.`语法。如`{{ ansible_eth0.ipv4.address }}`或`{{ ansible_eth0['ipv4']['address'] }}`

## Host and Group variables

ansible 可以方便地定义或覆盖每个主机或组的变量。最简单的方法是直接在inventory文件中定义：

```yaml
[group]
host1 admin_user=jane
host2 admin_user=jack
host3

[group:vars]
admin_user=john
```

在上述例子中，ansible 将会使用`john`作为变量`{{ admin_user }}`的默认值，但是对于`host1`和`host2`，会使用自己定义的变量。

当playbooks复杂的时候，可能需要添加多个主机相关的变量。在这种情况下，可以在不同的地方定义这些变量。ansible会在inventory文件所在的目录搜索两个指定的目录：`group_vars`和`host_vars`。可以在这些目录里放置以组命名或以主机命名的yaml文件。例如：

```yaml
---
# File: /etc/ansible/group_vars/group
admin_user: john
```

```yaml
# File: /etc/ansible/host_vars/host1
admin_user: jane
```

即使使用一个默认的inventory文件(或者是在playbook目录之外)，ansible也会使用playbook自己的`group_vars`和`host_vars`目录。当要把整个playbook和配置文件打包时，这是比较方便的。也可以定义`group_vars/all`文件用于所有组，`host_vars/all`文件用于所有主机。

## Magic variables with host and group variables and information

如果想要获取一个其他主机的变量，ansible定义了一个`hostvars`变量来包含所有定义的主机变量：

```yaml
# From any host, returns "jane".
{{ hostvars['host1']['admin_user'] }}
```

还有许多其他变量可能会时常用到：

* groups: inventory 文件中定义的组名的列表
* group_names: 当前主机所属的组的列表
* inventory_hostname: 当前主机的hostname
* iventory_hostname_short: `inventory_hostname`的第一部分
* play_hosts: 当前的play要运行的所有主机

可以查看[Magic Variables, and How To Access Information About Other Hosts](http://docs.ansible.com/playbooks_variables.html#magic-variables-and-how-to-access-information-about-other-hosts)获取更多信息。

## Facts(Variables derived from system information)

默认情况下，无论何时执行ansible playbook，ansible首先获取每个主机的信息(facts)。当运行playbook时，facts非常有用，像IP地址，CPU类型，磁盘空间，操作系统信息，网络接口信息等都可以获取到。要获取到所有facts的列表，可以使用setup模块：

```bash
ansible all -m setup
```

如果不需要使用facts并且想要playbook执行快一点，可以在playbook中设置`gather_facts: no`

```yaml
- hosts: db
  gather_facts: no
```

## Local Facts(Facts.d)

另一种定义指定主机的变量是放置`.fact`文件到指定目录`/etc/ansible/facts.d`，这些文件可以是JSON或INI文件，也可以是一个返回JSON的可执行文件。例如，创建一个文件`/etc/ansible/facts.d/settings.fact`:

```yaml
[users]
admin=jane,john
normal=jim
```

```bash
ansible hostname -m setup -a "filter=ansible_local"
munin.midwesternmac.com | success >> {
    "ansible_facts": {
        "ansible_local": {
            "settings": {
                "users": {
                    "admin": "jane,john",
                    "normal": "jim"
                }
             }
        }
    },
    "changed": false
}
```
