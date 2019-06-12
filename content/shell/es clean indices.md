+++
title = "Es Clean Indices"
date = 2019-06-12T08:00:30Z
draft = false
tags = ["es", "curl"]
categories = ["shell"]
+++

# ES 清理索引

使用阿里云的 ES 服务存储应用的日志，随着业务的增长和 ES 的资源限制，索引过多会引起 ES 的崩溃。
日志的采集是通过 logback 发送到 kafka，再用 logstash 消费 kafka 并转发给 ES。logstash 配置了`%{[@metadata][kafka][topic]}-%{+YYYY-MM-dd}`作为 ES 的索引。
经过讨论准备只将日志存储一个月，需要定时去清理索引，防止索引过多。

## 获取索引

首先要做的是获取当前的索引，通过查阅 ES 的 [API](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices.html) 可知，可以用 `/_cat/indices` 接口来获取所有索引:

```bash
curl -X POST -s "http://es.example.site/_cat/indices"
```

可以看到如下结果:

```
green open test-app1-prod-log-2019-06-11      28NbwQbZTIaGPgb0S5Wkuw 5 1  189385 0 179.7mb  89.9mb
green open test-app1-prod-log-2019-06-10      0EiQBNhZTnGZqUZ92J9UEg 5 1  189385 0 179.7mb  93.3mb
green open test-app2-prod-log-2019-06-08      N_Th5gahSiu3kiycF26Q_A 5 1 2133105 0   4.5gb   2.2gb
```

需要将结果过滤一下，只保留 `%{[@metadata][kafka][topic]}` 的信息:

```bash
curl -X POST -s "http://es.example.site/_cat/indices" | awk '{print $3}' | sort | grep -oP ".*(?=-[0-9]*-[0-9]*-[0-9]*)" | uniq
```

得到如下结果:

```
test-app1-prod-log
test-app2-prod-log
```

## 编写脚本

```bash
#!/bin/bash
es_addr="http://es.example.site"
date=$(date -d "30 days ago" +%Y-%m-%d)

indices=(
    "test-app1-prod-log"
    "test-app2-prod-log"
)

date

for index in "${indices[@]}"; do
    echo "------------------------------------------"
    echo "${es_addr}/${index}-${date}"
    echo "close ..."
    curl -X POST -s "${es_addr}/$index-${date}/_close"
    echo "delete ..."
    curl -X DELETE -s "${es_addr}/${index}-${date}" && echo || echo failed
done
```

如果 ES 配置了允许用通配符来匹配 topic，在脚本的`indices`索引中可以用`*`来通配索引。如果在不允许通配的 ES 中使用通配符，请求会返回错误提示。

## 配置定时任务

运行`crontab -e`编辑定时任务，添加如下任务:

```
0 1 * * * /path/to/delete_es_index.sh 2>&1 >> /path/to/es_clear.log
```

这样每天凌晨一点会自动删除距离今天30天的索引
