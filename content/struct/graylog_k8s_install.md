+++
title = "Graylog K8s Install"
date = 2018-11-14T16:20:50+08:00
draft = false
tags = ["log", "k8s"]
categories = ["struct"]
+++

# graylog k8s 部署

graylog是一个日志聚合工具，用于统一展示应用日志。这里基于官方文档，在k8s集群中部署一套简单的单节点graylog服务。

## mongodb 部署

mongodb 在服务中用于存储graylog的配置信息。以下是部署文件（没有进行数据持久化操作）：

<details>
<summary>mongodb deploy</summary>
```yaml
# {{{ deploy
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: graylog-mongo
  labels:
    app: graylog-mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: graylog-mongo
  template:
    metadata:
      labels:
        app: graylog-mongo
    spec:
      containers:
        - name: graylog-mongo
          image: mongo:3
          ports:
            - containerPort: 27017
              protocol: TCP
          resources:
            limits:
              memory: 512Mi
            requests:
              memory: 100Mi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: IfNotPresent
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  revisionHistoryLimit: 2
# }}}
# {{{ service
---
apiVersion: v1
kind: Service
metadata:
  name: graylog-mongo
  labels:
    name: mongo
spec:
  ports:
    - name: mongo
      protocol: TCP
      port: 27017
      targetPort: 27017
  selector:
    app: graylog-mongo
  type: ClusterIP
  sessionAffinity: None
status:
  loadBalancer: {}
# }}}
```
</details>

## elasticsearch 部署

elasticsearch 在服务中用于存储日志数据。以下是部署文件（没有进行数据持久化操作）：

<details>
<summary>es deploy</summary>
```yaml
# {{{ deploy
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: graylog-elasticsearch
  labels:
    app: graylog-elasticsearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: graylog-elasticsearch
  template:
    metadata:
      labels:
        app: graylog-elasticsearch
    spec:
      containers:
        - name: graylog-elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:5.6.12
          ports:
            - containerPort: 9200
              protocol: TCP
          env:
            - name: "http.host"
              value: "0.0.0.0"
            - name: "transport.host"
              value: "localhost"
            - name: "network.host"
              value: "0.0.0.0"
            - name: "xpack.security.enabled"
              value: "false"
            - name: xpack.watcher.enabled
              value: "false"
            - name: xpack.monitoring.enabled
              value: "false"
            - name: xpack.security.audit.enabled
              value: "false"
            - name: xpack.ml.enabled
              value: "false"
            - name: xpack.graph.enabled
              value: "false"
            - name: "ES_JAVA_OPTS"
              value: "-Xms512m -Xmx512m"
          resources:
            limits:
              memory: 2048Mi
            requests:
              memory: 512Mi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: IfNotPresent
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  revisionHistoryLimit: 2
# }}}
# {{{ svc
---
apiVersion: v1
kind: Service
metadata:
  name: graylog-elasticsearch
  labels:
    name: graylog-elasticsearch
spec:
  ports:
    - name: es
      protocol: TCP
      port: 9200
      targetPort: 9200
  selector:
    app: graylog-elasticsearch
  type: ClusterIP
  sessionAffinity: None
status:
  loadBalancer: {}
# }}}
```
</details>

注意这里es用太新的版本可能会导致graylog启动报错。

## graylog 部署

部署文件：

<details>
<summary>graylog deploy</summary>
```yaml
# {{{ deploy
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: graylog
  labels:
    app: graylog
spec:
  replicas: 1
  selector:
    matchLabels:
      app: graylog
  template:
    metadata:
      labels:
        app: graylog
    spec:
      volumes:
        - name: graylog-conf
          configMap:
            name: graylog-conf
            defaultMode: 420
      containers:
        - name: graylog
          image: www.private.com/tools/graylog:2.4
          ports:
            - containerPort: 9000
              protocol: TCP
            - containerPort: 5555
              protocol: TCP
            - containerPort: 5044
              protocol: TCP
            - containerPort: 514
              protocol: TCP
            - containerPort: 12201
              protocol: TCP
          env:
            - name: "GRAYLOG_WEB_ENDPOINT_URI"
              value: "http://graylog.test.com/api"
            - name: "GRAYLOG_HTTP_EXTERNAL_URI"
              value: "http://graylog.test.com"
            - name: "GRAYLOG_PASSWORD_SECRET"
              value: "somepasswordpepper"
            - name: "GRAYLOG_ROOT_PASSWORD_SHA2"
              value: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
          resources:
            limits:
              memory: 2048Mi
            requests:
              memory: 512Mi
          volumeMounts:
            - name: graylog-conf
              mountPath: /usr/share/graylog/data/config/graylog.conf
              subPath: graylog.conf
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: IfNotPresent
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  revisionHistoryLimit: 2
# }}}
# {{{ svc
---
apiVersion: v1
kind: Service
metadata:
  name: graylog
  labels:
    name: graylog
spec:
  ports:
    - name: web
      protocol: TCP
      port: 9000
      targetPort: 9000
    - name: tcp-input
      protocol: TCP
      port: 5555
      targetPort: 5555
    - name: beats-input
      protocol: TCP
      port: 5044
      targetPort: 5555
    - name: syslog
      protocol: TCP
      port: 514
      targetPort: 514
    - name: gelf
      protocol: TCP
      port: 12201
      targetPort: 12201
  selector:
    app: graylog
  type: ClusterIP
  sessionAffinity: None
status:
  loadBalancer: {}
# }}}
# {{{ cm
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: graylog-conf
data:
  graylog.conf: |
    ############################
    # GRAYLOG CONFIGURATION FILE
    ############################
    #
    # This is the Graylog configuration file. The file has to use ISO 8859-1/Latin-1 character encoding.
    # Characters that cannot be directly represented in this encoding can be written using Unicode escapes
    # as defined in https://docs.oracle.com/javase/specs/jls/se8/html/jls-3.html#jls-3.3, using the \u prefix.
    # For example, \u002c.
    #
    # * Entries are generally expected to be a single line of the form, one of the following:
    #
    # propertyName=propertyValue
    # propertyName:propertyValue
    #
    # * White space that appears between the property name and property value is ignored,
    #   so the following are equivalent:
    #
    # name=Stephen
    # name = Stephen
    #
    # * White space at the beginning of the line is also ignored.
    #
    # * Lines that start with the comment characters ! or # are ignored. Blank lines are also ignored.
    #
    # * The property value is generally terminated by the end of the line. White space following the
    #   property value is not ignored, and is treated as part of the property value.
    #
    # * A property value can span several lines if each line is terminated by a backslash (‘\’) character.
    #   For example:
    #
    # targetCities=\
    #         Detroit,\
    #         Chicago,\
    #         Los Angeles
    #
    #   This is equivalent to targetCities=Detroit,Chicago,Los Angeles (white space at the beginning of lines is ignored).
    #
    # * The characters newline, carriage return, and tab can be inserted with characters \n, \r, and \t, respectively.
    #
    # * The backslash character must be escaped as a double backslash. For example:
    #
    # path=c:\\docs\\doc1
    #

    # If you are running more than one instances of Graylog server you have to select one of these
    # instances as master. The master will perform some periodical tasks that non-masters won't perform.
    is_master = true

    # The auto-generated node ID will be stored in this file and read after restarts. It is a good idea
    # to use an absolute file path here if you are starting Graylog server from init scripts or similar.
    node_id_file = /usr/share/graylog/data/config/node-id

    # You MUST set a secret to secure/pepper the stored user passwords here. Use at least 64 characters.
    # Generate one by using for example: pwgen -N 1 -s 96
    #password_secret = admin

    # The default root user is named 'admin'
    #root_username = admin

    # You MUST specify a hash password for the root user (which you only need to initially set up the
    # system and in case you lose connectivity to your authentication backend)
    # This password cannot be changed using the API or via the web interface. If you need to change it,
    # modify it in this file.
    # Create one by using for example: echo -n yourpassword | shasum -a 256
    # and put the resulting hash value into the following line

    # Default password: admin
    # CHANGE THIS!
    root_password_sha2 = 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

    # The email address of the root user.
    # Default is empty
    #root_email = ""

    # The time zone setting of the root user. See http://www.joda.org/joda-time/timezones.html for a list of valid time zones.
    # Default is UTC
    root_timezone = Asia/Shanghai

    # Set plugin directory here (relative or absolute)
    plugin_dir = /usr/share/graylog/plugin

    # REST API listen URI. Must be reachable by other Graylog server nodes if you run a cluster.
    # When using Graylog Collectors, this URI will be used to receive heartbeat messages and must be accessible for all collectors.
    rest_listen_uri = http://0.0.0.0:9000/api/

    # REST API transport address. Defaults to the value of rest_listen_uri. Exception: If rest_listen_uri
    # is set to a wildcard IP address (0.0.0.0) the first non-loopback IPv4 system address is used.
    # If set, this will be promoted in the cluster discovery APIs, so other nodes may try to connect on
    # this address and it is used to generate URLs addressing entities in the REST API. (see rest_listen_uri)
    # You will need to define this, if your Graylog server is running behind a HTTP proxy that is rewriting
    # the scheme, host name or URI.
    # This must not contain a wildcard address (0.0.0.0).
    #rest_transport_uri = http://192.168.1.1:9000/api/

    # Enable CORS headers for REST API. This is necessary for JS-clients accessing the server directly.
    # If these are disabled, modern browsers will not be able to retrieve resources from the server.
    # This is enabled by default. Uncomment the next line to disable it.
    #rest_enable_cors = false

    # Enable GZIP support for REST API. This compresses API responses and therefore helps to reduce
    # overall round trip times. This is enabled by default. Uncomment the next line to disable it.
    #rest_enable_gzip = false

    # Enable HTTPS support for the REST API. This secures the communication with the REST API with
    # TLS to prevent request forgery and eavesdropping. This is disabled by default. Uncomment the
    # next line to enable it.
    #rest_enable_tls = true

    # The X.509 certificate chain file in PEM format to use for securing the REST API.
    #rest_tls_cert_file = /path/to/graylog.crt

    # The PKCS#8 private key file in PEM format to use for securing the REST API.
    #rest_tls_key_file = /path/to/graylog.key

    # The password to unlock the private key used for securing the REST API.
    #rest_tls_key_password = secret

    # The maximum size of the HTTP request headers in bytes.
    #rest_max_header_size = 8192

    # The size of the thread pool used exclusively for serving the REST API.
    #rest_thread_pool_size = 16

    # Comma separated list of trusted proxies that are allowed to set the client address with X-Forwarded-For
    # header. May be subnets, or hosts.
    #trusted_proxies = 127.0.0.1/32, 0:0:0:0:0:0:0:1/128

    # Enable the embedded Graylog web interface.
    # Default: true
    #web_enable = false

    # Web interface listen URI.
    # Configuring a path for the URI here effectively prefixes all URIs in the web interface. This is a replacement
    # for the application.context configuration parameter in pre-2.0 versions of the Graylog web interface.
    web_listen_uri = http://0.0.0.0:9000/

    # Web interface endpoint URI. This setting can be overriden on a per-request basis with the X-Graylog-Server-URL header.
    # Default: $rest_transport_uri
    #web_endpoint_uri =

    # Enable CORS headers for the web interface. This is necessary for JS-clients accessing the server directly.
    # If these are disabled, modern browsers will not be able to retrieve resources from the server.
    #web_enable_cors = false

    # Enable/disable GZIP support for the web interface. This compresses HTTP responses and therefore helps to reduce
    # overall round trip times. This is enabled by default. Uncomment the next line to disable it.
    #web_enable_gzip = false

    # Enable HTTPS support for the web interface. This secures the communication of the web browser with the web interface
    # using TLS to prevent request forgery and eavesdropping.
    # This is disabled by default. Uncomment the next line to enable it and see the other related configuration settings.
    #web_enable_tls = true

    # The X.509 certificate chain file in PEM format to use for securing the web interface.
    #web_tls_cert_file = /path/to/graylog-web.crt

    # The PKCS#8 private key file in PEM format to use for securing the web interface.
    #web_tls_key_file = /path/to/graylog-web.key

    # The password to unlock the private key used for securing the web interface.
    #web_tls_key_password = secret

    # The maximum size of the HTTP request headers in bytes.
    #web_max_header_size = 8192

    # The size of the thread pool used exclusively for serving the web interface.
    #web_thread_pool_size = 16

    # List of Elasticsearch hosts Graylog should connect to.
    # Need to be specified as a comma-separated list of valid URIs for the http ports of your elasticsearch nodes.
    # If one or more of your elasticsearch hosts require authentication, include the credentials in each node URI that
    # requires authentication.
    #
    # Default: http://127.0.0.1:9200
    elasticsearch_hosts = http://graylog-elasticsearch.tools.svc:9200

    # Maximum amount of time to wait for successfull connection to Elasticsearch HTTP port.
    #
    # Default: 10 Seconds
    #elasticsearch_connect_timeout = 10s

    # Maximum amount of time to wait for reading back a response from an Elasticsearch server.
    #
    # Default: 60 seconds
    #elasticsearch_socket_timeout = 60s

    # Maximum idle time for an Elasticsearch connection. If this is exceeded, this connection will
    # be tore down.
    #
    # Default: inf
    #elasticsearch_idle_timeout = -1s

    # Maximum number of total connections to Elasticsearch.
    #
    # Default: 20
    #elasticsearch_max_total_connections = 20

    # Maximum number of total connections per Elasticsearch route (normally this means per
    # elasticsearch server).
    #
    # Default: 2
    #elasticsearch_max_total_connections_per_route = 2

    # Maximum number of times Graylog will retry failed requests to Elasticsearch.
    #
    # Default: 2
    #elasticsearch_max_retries = 2

    # Enable automatic Elasticsearch node discovery through Nodes Info,
    # see https://www.elastic.co/guide/en/elasticsearch/reference/5.4/cluster-nodes-info.html
    #
    # WARNING: Automatic node discovery does not work if Elasticsearch requires authentication, e. g. with Shield.
    #
    # Default: false
    #elasticsearch_discovery_enabled = true

    # Filter for including/excluding Elasticsearch nodes in discovery according to their custom attributes,
    # see https://www.elastic.co/guide/en/elasticsearch/reference/5.4/cluster.html#cluster-nodes
    #
    # Default: empty
    #elasticsearch_discovery_filter = rack:42

    # Frequency of the Elasticsearch node discovery.
    #
    # Default: 30s
    # elasticsearch_discovery_frequency = 30s

    # Enable payload compression for Elasticsearch requests.
    #
    # Default: false
    #elasticsearch_compression_enabled = true

    # Disable checking the version of Elasticsearch for being compatible with this Graylog release.
    # WARNING: Using Graylog with unsupported and untested versions of Elasticsearch may lead to data loss!
    #elasticsearch_disable_version_check = true

    # Disable message retention on this node, i. e. disable Elasticsearch index rotation.
    #no_retention = false

    # Do you want to allow searches with leading wildcards? This can be extremely resource hungry and should only
    # be enabled with care. See also: http://docs.graylog.org/en/2.1/pages/queries.html
    allow_leading_wildcard_searches = false

    # Do you want to allow searches to be highlighted? Depending on the size of your messages this can be memory hungry and
    # should only be enabled after making sure your Elasticsearch cluster has enough memory.
    allow_highlighting = false

    # Global request timeout for Elasticsearch requests (e. g. during search, index creation, or index time-range
    # calculations) based on a best-effort to restrict the runtime of Elasticsearch operations.
    # Default: 1m
    #elasticsearch_request_timeout = 1m

    # Global timeout for index optimization (force merge) requests.
    # Default: 1h
    #elasticsearch_index_optimization_timeout = 1h

    # Maximum number of concurrently running index optimization (force merge) jobs.
    # If you are using lots of different index sets, you might want to increase that number.
    # Default: 20
    #elasticsearch_index_optimization_jobs = 20

    # Time interval for index range information cleanups. This setting defines how often stale index range information
    # is being purged from the database.
    # Default: 1h
    #index_ranges_cleanup_interval = 1h

    # Batch size for the Elasticsearch output. This is the maximum (!) number of messages the Elasticsearch output
    # module will get at once and write to Elasticsearch in a batch call. If the configured batch size has not been
    # reached within output_flush_interval seconds, everything that is available will be flushed at once. Remember
    # that every outputbuffer processor manages its own batch and performs its own batch write calls.
    # ("outputbuffer_processors" variable)
    output_batch_size = 500

    # Flush interval (in seconds) for the Elasticsearch output. This is the maximum amount of time between two
    # batches of messages written to Elasticsearch. It is only effective at all if your minimum number of messages
    # for this time period is less than output_batch_size * outputbuffer_processors.
    output_flush_interval = 1

    # As stream outputs are loaded only on demand, an output which is failing to initialize will be tried over and
    # over again. To prevent this, the following configuration options define after how many faults an output will
    # not be tried again for an also configurable amount of seconds.
    output_fault_count_threshold = 5
    output_fault_penalty_seconds = 30

    # The number of parallel running processors.
    # Raise this number if your buffers are filling up.
    processbuffer_processors = 5
    outputbuffer_processors = 3

    # The following settings (outputbuffer_processor_*) configure the thread pools backing each output buffer processor.
    # See https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/ThreadPoolExecutor.html for technical details

    # When the number of threads is greater than the core (see outputbuffer_processor_threads_core_pool_size),
    # this is the maximum time in milliseconds that excess idle threads will wait for new tasks before terminating.
    # Default: 5000
    #outputbuffer_processor_keep_alive_time = 5000

    # The number of threads to keep in the pool, even if they are idle, unless allowCoreThreadTimeOut is set
    # Default: 3
    #outputbuffer_processor_threads_core_pool_size = 3

    # The maximum number of threads to allow in the pool
    # Default: 30
    #outputbuffer_processor_threads_max_pool_size = 30

    # UDP receive buffer size for all message inputs (e. g. SyslogUDPInput).
    #udp_recvbuffer_sizes = 1048576

    # Wait strategy describing how buffer processors wait on a cursor sequence. (default: sleeping)
    # Possible types:
    #  - yielding
    #     Compromise between performance and CPU usage.
    #  - sleeping
    #     Compromise between performance and CPU usage. Latency spikes can occur after quiet periods.
    #  - blocking
    #     High throughput, low latency, higher CPU usage.
    #  - busy_spinning
    #     Avoids syscalls which could introduce latency jitter. Best when threads can be bound to specific CPU cores.
    processor_wait_strategy = blocking

    # Size of internal ring buffers. Raise this if raising outputbuffer_processors does not help anymore.
    # For optimum performance your LogMessage objects in the ring buffer should fit in your CPU L3 cache.
    # Must be a power of 2. (512, 1024, 2048, ...)
    ring_size = 65536

    inputbuffer_ring_size = 65536
    inputbuffer_processors = 2
    inputbuffer_wait_strategy = blocking

    # Enable the disk based message journal.
    message_journal_enabled = true

    # The directory which will be used to store the message journal. The directory must me exclusively used by Graylog and
    # must not contain any other files than the ones created by Graylog itself.
    #
    # ATTENTION:
    #   If you create a seperate partition for the journal files and use a file system creating directories like 'lost+found'
    #   in the root directory, you need to create a sub directory for your journal.
    #   Otherwise Graylog will log an error message that the journal is corrupt and Graylog will not start.
    message_journal_dir = /usr/share/graylog/data/journal

    # Journal hold messages before they could be written to Elasticsearch.
    # For a maximum of 12 hours or 5 GB whichever happens first.
    # During normal operation the journal will be smaller.
    #message_journal_max_age = 12h
    #message_journal_max_size = 5gb

    #message_journal_flush_age = 1m
    #message_journal_flush_interval = 1000000
    #message_journal_segment_age = 1h
    #message_journal_segment_size = 100mb

    # Number of threads used exclusively for dispatching internal events. Default is 2.
    #async_eventbus_processors = 2

    # How many seconds to wait between marking node as DEAD for possible load balancers and starting the actual
    # shutdown process. Set to 0 if you have no status checking load balancers in front.
    lb_recognition_period_seconds = 3

    # Journal usage percentage that triggers requesting throttling for this server node from load balancers. The feature is
    # disabled if not set.
    #lb_throttle_threshold_percentage = 95

    # Every message is matched against the configured streams and it can happen that a stream contains rules which
    # take an unusual amount of time to run, for example if its using regular expressions that perform excessive backtracking.
    # This will impact the processing of the entire server. To keep such misbehaving stream rules from impacting other
    # streams, Graylog limits the execution time for each stream.
    # The default values are noted below, the timeout is in milliseconds.
    # If the stream matching for one stream took longer than the timeout value, and this happened more than "max_faults" times
    # that stream is disabled and a notification is shown in the web interface.
    #stream_processing_timeout = 2000
    #stream_processing_max_faults = 3

    # Length of the interval in seconds in which the alert conditions for all streams should be checked
    # and alarms are being sent.
    #alert_check_interval = 60

    # Since 0.21 the Graylog server supports pluggable output modules. This means a single message can be written to multiple
    # outputs. The next setting defines the timeout for a single output module, including the default output module where all
    # messages end up.
    #
    # Time in milliseconds to wait for all message outputs to finish writing a single message.
    #output_module_timeout = 10000

    # Time in milliseconds after which a detected stale master node is being rechecked on startup.
    #stale_master_timeout = 2000

    # Time in milliseconds which Graylog is waiting for all threads to stop on shutdown.
    #shutdown_timeout = 30000

    # MongoDB connection string
    # See https://docs.mongodb.com/manual/reference/connection-string/ for details
    mongodb_uri = mongodb://graylog-mongo.tools.svc:27017/graylog

    # Authenticate against the MongoDB server
    #mongodb_uri = mongodb://grayloguser:secret@mongo:27017/graylog

    # Use a replica set instead of a single host
    #mongodb_uri = mongodb://grayloguser:secret@mongo:27017,mongo:27018,mongo:27019/graylog

    # Increase this value according to the maximum connections your MongoDB server can handle from a single client
    # if you encounter MongoDB connection problems.
    mongodb_max_connections = 100

    # Number of threads allowed to be blocked by MongoDB connections multiplier. Default: 5
    # If mongodb_max_connections is 100, and mongodb_threads_allowed_to_block_multiplier is 5,
    # then 500 threads can block. More than that and an exception will be thrown.
    # http://api.mongodb.com/java/current/com/mongodb/MongoOptions.html#threadsAllowedToBlockForConnectionMultiplier
    mongodb_threads_allowed_to_block_multiplier = 5

    # Drools Rule File (Use to rewrite incoming log messages)
    # See: http://docs.graylog.org/en/2.1/pages/drools.html
    #rules_file = /etc/graylog/server/rules.drl

    # Email transport
    #transport_email_enabled = false
    #transport_email_hostname = mail.example.com
    #transport_email_port = 587
    #transport_email_use_auth = true
    #transport_email_use_tls = true
    #transport_email_use_ssl = true
    #transport_email_auth_username = you@example.com
    #transport_email_auth_password = secret
    #transport_email_subject_prefix = [graylog]
    #transport_email_from_email = graylog@example.com

    # Specify and uncomment this if you want to include links to the stream in your stream alert mails.
    # This should define the fully qualified base url to your web interface exactly the same way as it is accessed by your users.
    #transport_email_web_interface_url = https://graylog.example.com

    # The default connect timeout for outgoing HTTP connections.
    # Values must be a positive duration (and between 1 and 2147483647 when converted to milliseconds).
    # Default: 5s
    #http_connect_timeout = 5s

    # The default read timeout for outgoing HTTP connections.
    # Values must be a positive duration (and between 1 and 2147483647 when converted to milliseconds).
    # Default: 10s
    #http_read_timeout = 10s

    # The default write timeout for outgoing HTTP connections.
    # Values must be a positive duration (and between 1 and 2147483647 when converted to milliseconds).
    # Default: 10s
    #http_write_timeout = 10s

    # HTTP proxy for outgoing HTTP connections
    #http_proxy_uri =

    # The threshold of the garbage collection runs. If GC runs take longer than this threshold, a system notification
    # will be generated to warn the administrator about possible problems with the system. Default is 1 second.
    #gc_warning_threshold = 1s

    # Connection timeout for a configured LDAP server (e. g. ActiveDirectory) in milliseconds.
    #ldap_connection_timeout = 2000

    # Disable the use of SIGAR for collecting system stats
    #disable_sigar = false

    # The default cache time for dashboard widgets. (Default: 10 seconds, minimum: 1 second)
    #dashboard_widget_default_cache_time = 10s

    # Automatically load content packs in "content_packs_dir" on the first start of Graylog.
    content_packs_loader_enabled = true

    # The directory which contains content packs which should be loaded on the first start of Graylog.
    content_packs_dir = /usr/share/graylog/data/contentpacks

    # A comma-separated list of content packs (files in "content_packs_dir") which should be applied on
    # the first start of Graylog.
    # Default: empty
    content_packs_auto_load = grok-patterns.json

    # For some cluster-related REST requests, the node must query all other nodes in the cluster. This is the maximum number
    # of threads available for this. Increase it, if '/cluster/*' requests take long to complete.
    # Should be rest_thread_pool_size * average_cluster_size if you have a high number of concurrent users.
    proxied_requests_thread_pool_size = 32
# }}}
# {{{ ingress
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: graylog
spec:
  rules:
  - host: graylog.test.com
    http:
      paths:
      - backend:
          serviceName: graylog
          servicePort: 9000
# }}}
```
</details>

注意把部署文件中的域名替换为合适的域名。

按照顺序部署三个服务，等待启动后就可以访问了。这里配置的用户名和密码是`admin/admin`。如果启动报错可以在页面上点击详细信息查看。
