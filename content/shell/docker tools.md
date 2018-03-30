+++
title = "Docker Tools"
date = 2018-03-19T10:39:22+08:00
draft = true
tags = ["docker"]
categories = ["solved"]
+++

# 单节点redis

## docker

```bash
docker run -d -p 16379:6379 redis
```

## k8s

deployment:

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: 'redis:latest'
          ports:
            - containerPort: 6379
              protocol: TCP
          resources:
            limits:
              cpu: '1'
              memory: 4Gi
            requests:
              cpu: 100m
              memory: 1Gi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: Always
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
```

service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
    - name: redis
      protocol: TCP
      port: 8079
      targetPort: 6379
  selector:
    app: redis
  type: ClusterIP
  externalIPs:
    - 10.0.52.189
  sessionAffinity: None
```

---

# mysql

## docker

```bash
docker run -d -p 8006:3306 -e MYSQL_ROOT_PASSWORD="admin" -e MYSQL_USER="test" MYSQL_PASSWORD="admin" -v /root/mysql/cnf/:/etc/mysql/ -v /root/mysql/dataDir:/var/lib/mysql mysql:5.7
```

## k8s

---

# phpmyAdmin

## docker

```bash
docker run --name myadmin -d -e PMA_ARBITRARY=1 -p 8080:80 phpmyadmin/phpmyadmin
```

## k8s

deployment:

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: phpmyadmin
  labels:
    name: phpmyadmin
spec:
  replicas: 1
  selector:
    matchLabels:
      name: phpmyadmin
  template:
    metadata:
      labels:
        name: phpmyadmin
    spec:
      containers:
        - name: phpmyadmin
          image: 'registry.saas.crland.com.cn/tools/phpmyadmin:latest'
          ports:
            - containerPort: 80
              protocol: TCP
          env:
            - name: PMA_ARBITRARY
              value: '1'
          resources:
            limits:
              memory: 200Mi
            requests:
              memory: 100Mi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: Always
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  revisionHistoryLimit: 2
```

service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: phpmyadmin
  labels:
    name: phpmyadmin
spec:
  ports:
    - protocol: TCP
      port: 8040
      targetPort: 80
  selector:
    name: phpmyadmin
  type: ClusterIP
  externalIPs:
    - 10.0.52.191
  sessionAffinity: None
```

# oracle se

image: [oracle database](https://github.com/oracle/docker-images/blob/master/OracleDatabase/SingleInstance/README.md#running-oracle-database-in-a-docker-container)

## k8s

```yml`
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: oracle-se
  labels:
    app: oracle-se
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: uat-nfs.saas.crland.com.cn
    path: /app/db/oracle-se

---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: oracle-se
  namespace: db
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  selector:
    matchLabels:
      app: oracle-se

---
apiVersion: v1
kind: Service
metadata:
  name: oracle-se
  namespace: db
spec:
  ports:
    - name: port1
      protocol: TCP
      port: 1521
      targetPort: 1521
    - name: port2
      protocol: TCP
      port: 5500
      targetPort: 5500
  selector:
    app: oracle-se
  type: ClusterIP
  sessionAffinity: None

---
apiVersion: v1
kind: Service
metadata:
  name: oracle-se-extend
  namespace: db
spec:
  ports:
    - name: port1
      protocol: TCP
      port: 8021
      targetPort: 1521
  selector:
    app: oracle-se
  type: ClusterIP
  externalIPs:
    - 10.0.52.184
  sessionAffinity: None

---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: oracle-se
  namespace: db
  labels:
    app: oracle-se
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oracle-se
  template:
    metadata:
      labels:
        app: oracle-se
    spec:
      containers:
        - name: oracle-se
          image: registry.saas.crland.com.cn/tools/oracle/database:12.1.0.2-se2
          ports:
            - containerPort: 1521
              protocol: TCP
            - containerPort: 5500
              protocol: TCP
          env:
            - name: ORACLE_SID
              value:
            - name: ORACLE_PDB
              value:
            - name: ORACLE_PWD
              value: handhand
            - name: ORACLE_CHARACTERSET
              value:
          resources:
            limits:
              memory: 4096Mi
            requests:
              memory: 2048Mi
          terminationMessagePath: /dev/termination-log
          imagePullPolicy: IfNotPresent
          volumeMounts:
            - name: oracle-data
              mountPath: /opt/oracle/oradata
      restartPolicy: Always
      terminationGracePeriodSeconds: 30
      dnsPolicy: ClusterFirst
      securityContext: {}
      volumes:
        - name: oracle-data
          persistentVolumeClaim:
            claimName: oracle-se
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  revisionHistoryLimit: 2

---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: oracle-se-ingress
spec:
  rules:
  - host: oracle-se.uat-saas.crland.com.cn
    http:
      paths:
      - path: /em
        backend:
          serviceName: oracle-se
          servicePort: 5500
```
