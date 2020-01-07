+++
title = "Centos Install Choerodon Offline"
date = 2019-11-19T10:19:51+08:00
draft = true
tags = ["choerodon", "offline", "k8s", "ansible"]
categories = ["solved"]
+++

# centos 离线安装 choerodon

## 离线资源准备

资源目录

```
.
├── apps               # 通过非包管理器安装的应用 
├── helm               # helm 的部署包
├── kubeadm-ha         # ansible 部署脚本
├── packages           # yum 安装的软件包
└── pip3_package       # pip3 安装的软件包
```

images:

```
busybox:latest
dockerhub.azk8s.cn/library/nginx:1.17.4-alpine
gcr.azk8s.cn/google_containers/kube-apiserver:v1.15.5
gcr.azk8s.cn/google_containers/kube-controller-manager:v1.15.5
gcr.azk8s.cn/google_containers/kube-proxy:v1.15.5
gcr.azk8s.cn/google_containers/kube-scheduler:v1.15.5
quay.azk8s.cn/kubernetes-ingress-controller/nginx-ingress-controller:0.26.1
gcr.azk8s.cn/google_containers/metrics-server-amd64:v0.3.5
goharbor/redis-photon:v1.8.3
goharbor/clair-photon:v2.0.8-v1.8.3
goharbor/notary-server-photon:v0.6.1-v1.8.3
goharbor/notary-signer-photon:v0.6.1-v1.8.3
goharbor/registry-photon:v2.7.1-patch-2819-v1.8.3
goharbor/nginx-photon:v1.8.3
gcr.azk8s.cn/google_containers/etcd:3.3.15-0
dockerhub.azk8s.cn/kubernetesui/dashboard:v2.0.0-beta4
minio/minio:RELEASE.2019-03-27T22-35-21Z
quay.azk8s.cn/coreos/flannel:v0.11.0-amd64
gcr.azk8s.cn/google_containers/coredns:1.3.1
redis:4.0.11
mysql:5.7.23
quay.io/external_storage/nfs-client-provisioner:v3.1.0-k8s1.11
chartmuseum/chartmuseum:v0.7.1
gcr.azk8s.cn/google_containers/pause:3.1
```

yum packages:

```
14bfe6e75a9efc8eca3f638eb22c7e2ce759c67f95b43b16fae4ebabde1549f3-cri-tools-1.13.0-0.x86_64.rpm
4e3e9edc797eed91c0d5ab63b3dd464e82d877e355cae5f35e8f31c9e203658a-kubelet-1.15.5-0.x86_64.rpm
548a0dcd865c16a50980420ddfa5fbccb8b59621179798e6dc905c9bf8af3b34-kubernetes-cni-0.7.5-0.x86_64.rpm
90dbd280f7fa38882e359cb83ca415f8d3596d9e4ff3e8e8fc11013042a0c192-kubectl-1.15.5-0.x86_64.rpm
a1ae562a4bcac2ccc85a4a7947cd062ecab691011ec59657bc705318e7477143-kubeadm-1.15.5-0.x86_64.rpm
apr-1.4.8-5.el7.x86_64.rpm
apr-util-1.5.2-6.el7.x86_64.rpm
audit-2.8.5-4.el7.x86_64.rpm
audit-libs-2.8.5-4.el7.x86_64.rpm
audit-libs-python-2.8.5-4.el7.x86_64.rpm
bash-completion-2.1-6.el7.noarch.rpm
centos-logos-70.0.6-3.el7.centos.noarch.rpm
checkpolicy-2.5-8.el7.x86_64.rpm
conntrack-tools-1.4.4-5.el7_7.2.x86_64.rpm
containerd.io-1.2.10-3.2.el7.x86_64.rpm
container-selinux-2.107-3.el7.noarch.rpm
createrepo-0.9.9-28.el7.noarch.rpm
curl-7.29.0-54.el7.x86_64.rpm
deltarpm-3.6-3.el7.x86_64.rpm
device-mapper-1.02.158-2.el7_7.2.x86_64.rpm
device-mapper-event-1.02.158-2.el7_7.2.x86_64.rpm
device-mapper-event-libs-1.02.158-2.el7_7.2.x86_64.rpm
device-mapper-libs-1.02.158-2.el7_7.2.x86_64.rpm
device-mapper-persistent-data-0.8.5-1.el7.x86_64.rpm
docker-ce-19.03.1-3.el7.x86_64.rpm
docker-ce-cli-19.03.1-3.el7.x86_64.rpm
epel-release-7-11.noarch.rpm
epel-release-7-12.noarch.rpm
git-1.8.3.1-20.el7.x86_64.rpm
glibc-2.17-292.el7.x86_64.rpm
glibc-common-2.17-292.el7.x86_64.rpm
gpm-libs-1.20.7-6.el7.x86_64.rpm
gssproxy-0.7.0-26.el7.x86_64.rpm
htop-2.2.0-3.el7.x86_64.rpm
httpd-2.4.6-90.el7.centos.x86_64.rpm
httpd-tools-2.4.6-90.el7.centos.x86_64.rpm
iotop-0.6-4.el7.noarch.rpm
ipset-7.1-1.el7.x86_64.rpm
ipset-libs-7.1-1.el7.x86_64.rpm
ipvsadm-1.27-7.el7.x86_64.rpm
jq-1.5-1.el7.x86_64.rpm
keyutils-1.5.8-3.el7.x86_64.rpm
libaio-0.3.109-13.el7.x86_64.rpm
libbasicobjects-0.1.1-32.el7.x86_64.rpm
libcgroup-0.41-21.el7.x86_64.rpm
libcollection-0.7.0-32.el7.x86_64.rpm
libcurl-7.29.0-54.el7.x86_64.rpm
libevent-2.0.21-4.el7.x86_64.rpm
libini_config-1.3.1-32.el7.x86_64.rpm
libnetfilter_cthelper-1.0.0-10.el7_7.1.x86_64.rpm
libnetfilter_cttimeout-1.0.0-6.el7_7.1.x86_64.rpm
libnetfilter_queue-1.0.2-2.el7_2.x86_64.rpm
libnfsidmap-0.25-19.el7.x86_64.rpm
libpath_utils-0.2.1-32.el7.x86_64.rpm
libpcap-1.5.3-11.el7.x86_64.rpm
libref_array-0.1.5-32.el7.x86_64.rpm
libsemanage-python-2.5-14.el7.x86_64.rpm
libtalloc-2.1.14-1.el7.x86_64.rpm
libtevent-0.9.37-1.el7.x86_64.rpm
libtirpc-0.2.4-0.16.el7.x86_64.rpm
libtirpc-devel-0.2.4-0.16.el7.x86_64.rpm
libverto-tevent-0.2.5-4.el7.x86_64.rpm
libxml2-python-2.9.1-6.el7_2.3.x86_64.rpm
lm_sensors-libs-3.4.0-8.20160601gitf9185e5.el7.x86_64.rpm
lvm2-2.02.185-2.el7_7.2.x86_64.rpm
lvm2-libs-2.02.185-2.el7_7.2.x86_64.rpm
mailcap-2.1.41-2.el7.noarch.rpm
net-tools-2.0-0.25.20131004git.el7.x86_64.rpm
nfs-utils-1.3.0-0.65.el7.x86_64.rpm
nmap-ncat-6.40-19.el7.x86_64.rpm
nspr-4.21.0-1.el7.x86_64.rpm
nss-softokn-freebl-3.44.0-5.el7.x86_64.rpm
nss-util-3.44.0-3.el7.x86_64.rpm
oniguruma-5.9.5-3.el7.x86_64.rpm
perl-5.16.3-294.el7_6.x86_64.rpm
perl-Carp-1.26-244.el7.noarch.rpm
perl-constant-1.27-2.el7.noarch.rpm
perl-Encode-2.51-7.el7.x86_64.rpm
perl-Error-0.17020-2.el7.noarch.rpm
perl-Exporter-5.68-3.el7.noarch.rpm
perl-File-Path-2.09-2.el7.noarch.rpm
perl-File-Temp-0.23.01-3.el7.noarch.rpm
perl-Filter-1.49-3.el7.x86_64.rpm
perl-Getopt-Long-2.40-3.el7.noarch.rpm
perl-Git-1.8.3.1-20.el7.noarch.rpm
perl-HTTP-Tiny-0.033-3.el7.noarch.rpm
perl-libs-5.16.3-294.el7_6.x86_64.rpm
perl-macros-5.16.3-294.el7_6.x86_64.rpm
perl-parent-0.225-244.el7.noarch.rpm
perl-PathTools-3.40-5.el7.x86_64.rpm
perl-Pod-Escapes-1.04-294.el7_6.noarch.rpm
perl-podlators-2.5.1-3.el7.noarch.rpm
perl-Pod-Perldoc-3.20-4.el7.noarch.rpm
perl-Pod-Simple-3.28-4.el7.noarch.rpm
perl-Pod-Usage-1.63-3.el7.noarch.rpm
perl-Scalar-List-Utils-1.27-248.el7.x86_64.rpm
perl-Socket-2.010-4.el7.x86_64.rpm
perl-Storable-2.45-3.el7.x86_64.rpm
perl-TermReadKey-2.30-20.el7.x86_64.rpm
perl-Text-ParseWords-3.29-4.el7.noarch.rpm
perl-threads-1.87-4.el7.x86_64.rpm
perl-threads-shared-1.43-6.el7.x86_64.rpm
perl-Time-HiRes-1.9725-3.el7.x86_64.rpm
perl-Time-Local-1.2300-2.el7.noarch.rpm
policycoreutils-2.5-33.el7.x86_64.rpm
policycoreutils-python-2.5-33.el7.x86_64.rpm
python3-3.6.8-10.el7.x86_64.rpm
python3-libs-3.6.8-10.el7.x86_64.rpm
python3-pip-9.0.3-5.el7.noarch.rpm
python3-setuptools-39.2.0-10.el7.noarch.rpm
python-chardet-2.2.1-3.el7.noarch.rpm
python-deltarpm-3.6-3.el7.x86_64.rpm
python-IPy-0.75-6.el7.noarch.rpm
python-kitchen-1.1.1-5.el7.noarch.rpm
quota-4.01-19.el7.x86_64.rpm
quota-nls-4.01-19.el7.noarch.rpm
repodata
rpcbind-0.2.0-48.el7.x86_64.rpm
setools-libs-3.3.8-4.el7.x86_64.rpm
socat-1.7.3.2-2.el7.x86_64.rpm
sshpass-1.06-2.el7.x86_64.rpm
sysstat-10.1.5-18.el7.x86_64.rpm
tcp_wrappers-7.6-77.el7.x86_64.rpm
telnet-0.17-64.el7.x86_64.rpm
vim-common-7.4.629-6.el7.x86_64.rpm
vim-enhanced-7.4.629-6.el7.x86_64.rpm
vim-filesystem-7.4.629-6.el7.x86_64.rpm
yum-utils-1.1.31-52.el7.noarch.rpm
```

pip3 requirements:

```
ansible==2.8.3
cffi==1.13.2
cryptography==2.8
Jinja2==2.10.3
MarkupSafe==1.1.1
netaddr==0.7.19
pycparser==2.19
PyYAML==5.1.2
six==1.13.0
```

要获取最新的离线资源，最好是先在线安装一遍。在线安装手册参考[官方文档](http://choerodon.io/zh/docs/installation-configuration/steps/kubernetes/)。以下是安装中需要进行的操作:

1. 首先在相同配置的服务器上下载所需软件包，修改 yum 配置 `/etc/yum.conf`:

```bash
sed -i "s/keepcache=0/keepcache=1/g" /etc/yum.conf
```

1. 安装依赖和常用软件

```bash
yum install epel-release git python3-pip sshpass vim
```

1. 安装 ansible:

```bash
pip3 install --no-cache-dir ansible==2.8.3 netaddr==0.7.19 -i https://mirrors.aliyun.com/pypi/simple/
```

1. 获取 pip3 的安装包:

```bash
pip3 freeze > requirements.txt
mkdir -p pip3_package
pip3 download -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ -d pip3_package
mv requirements.txt pip3_package
tar -czvf pip3_package.tar.gz pip3_package
```

1. 获取 ansible-playbook 安装脚本，并安装 ansible:

```bash
git clone https://github.com/choerodon/kubeadm-ha.git
cd kubeadm-ha
sudo ./install-ansible.sh
```

1. 备份软件包(这里先备份了一次软件包，是因为后面 ansible 安装脚本中有清除 yum 缓存的操作): 

```bash
mkdir -p packages

for dir in base epel extras updates; do
    cp /var/cache/yum/x86_64/7/$dir/packages/* packages
done
```


1. 根据实际情况修改 ansible inventory 文件。具体参考[官方文档](http://choerodon.io/zh/docs/installation-configuration/steps/kubernetes/)

1. 安装 kubernetes，等待 k8s 集群安装完成: 

```bash
ansible-playbook -i inventory.ini 90-init-cluster.yml
```

1. 安装 helm:

```bash
kubectl create serviceaccount --namespace kube-system helm-tiller
kubectl create clusterrolebinding helm-tiller-cluster-rule --clusterrole=cluster-admin --serviceaccount=kube-system:helm-tiller
curl -L -o helm-v2.14.3-linux-amd64.tar.gz https://file.choerodon.com.cn/kubernetes-helm/v2.14.3/helm-v2.14.3-linux-amd64.tar.gz
tar -zxvf helm-v2.14.3-linux-amd64.tar.gz
sudo mv linux-amd64/helm /usr/bin/helm
helm init \
    --history-max=3 \
    --tiller-image=gcr.azk8s.cn/kubernetes-helm/tiller:v2.14.3 \
    --stable-repo-url=https://mirror.azure.cn/kubernetes/charts/ \
    --service-account=helm-tiller
```

1. 备份 helm 安装包:

```bash
mkdir apps
mv helm-v2.14.3-linux-amd64.tar.gz apps
```

1. 在集群每个节点安装nfs-utils

```bash
ansible -i inventory.ini all -m shell -a "yum install -y nfs-utils"
```

1. 修改 nfs 配置文件 `/etc/exports` 并启动:

```bash
mkdir -p /u01/prod
cat <<EOF>>/etc/exports
/u01 192.168.12.1/16(rw,sync,insecure,no_subtree_check,no_root_squash)
EOF
```

1. 安装 nfs-client-provisioner 并保存部署包到本地:

```bash
helm repo add c7n https://openchart.choerodon.com.cn/choerodon/c7n/
helm repo update
helm install c7n/nfs-client-provisioner \
    --set rbac.create=true \
    --set persistence.enabled=true \
    --set storageClass.name=nfs-provisioner \
    --set persistence.nfsServer=192.168.12.81 \
    --set persistence.nfsPath=/u01/prod \
    --version 0.1.0 \
    --name nfs-client-provisioner \
    --namespace kube-system
    
mkdir -p helm && cd helm
helm fetch c7n/nfs-client-provisioner --version 0.1.0
```

1. 再次备份软件包:

```bash
for dir in base epel extras updates docker-ce kubernetes; do
    cp /var/cache/yum/x86_64/7/$dir/packages/* packages
done
```

1. 备份镜像，镜像列表如下:

```
dockerhub.azk8s.cn/library/nginx                                       1.17.4-alpine       dfc78cd150cf        4 weeks ago         21.2MB
gcr.azk8s.cn/google_containers/kube-proxy                              v1.15.5             cbd7f21fec99        5 weeks ago         82.4MB
gcr.azk8s.cn/google_containers/kube-apiserver                          v1.15.5             e534b1952a0d        5 weeks ago         207MB
gcr.azk8s.cn/google_containers/kube-controller-manager                 v1.15.5             1399a72fa1a9        5 weeks ago         159MB
gcr.azk8s.cn/google_containers/kube-scheduler                          v1.15.5             fab2dded59dd        5 weeks ago         81.1MB
gcr.azk8s.cn/google_containers/metrics-server-amd64                    v0.3.5              abf04c0f54ff        2 months ago        39.9MB
gcr.azk8s.cn/google_containers/etcd                                    3.3.15-0            b2756210eeab        2 months ago        247MB
dockerhub.azk8s.cn/kubernetesui/dashboard                              v2.0.0-beta4        6802d83967b9        2 months ago        84MB
quay.azk8s.cn/coreos/flannel                                           v0.11.0-amd64       ff281650a721        9 months ago        52.6MB
gcr.azk8s.cn/google_containers/coredns                                 1.3.1               eb516548c180        10 months ago       40.3MB
gcr.azk8s.cn/google_containers/pause                                   3.1                 da86e6ba6ca1        23 months ago       742kB

gcr.azk8s.cn/kubernetes-helm/tiller                                    v2.14.3             2d0a693df3ba        3 months ago        94.2MB
dockerhub.azk8s.cn/kubernetesui/metrics-scraper                        v1.0.1              709901356c11        4 months ago        40.1MB
quay.azk8s.cn/kubernetes-ingress-controller/nginx-ingress-controller   0.26.1              29024c9c6e70        7 weeks ago         483MB

for image in $(docker images --format "{{.Repository}}:{{.Tag}}"); do
    echo "save $image..."
    docker save $image -o ${image##*\/}.tar
done
```

1. 获取 chart museum 安装资源:

```bash
helm fetch c7n/persistentvolumeclaim --version 0.1.0
helm fetch c7n/chartmuseum --version 1.6.1
docker pull chartmuseum/chartmuseum:v0.7.1
docker save chartmuseum/chartmuseum:v0.7.1 -o chartmuseum:v0.7.1.tar
```

1. 获取 minio 安装资源:

```bash
helm fetch c7n/minio --version 0.1.0
docker pull minio/minio:RELEASE.2019-03-27T22-35-21Z
docker save minio/minio:RELEASE.2019-03-27T22-35-21Z -o minio:RELEASE.2019-03-27T22-35-21Z.tar
```

1. 获取 redis 安装资源

```bash
helm fetch c7n/redis --version 0.2.0
docker pull redis:4.0.11
docker save redis:4.0.11 -o redis:4.0.11.tar
```

1. 获取 mysql 安装资源:

```bash
helm fetch c7n/mysql --version 0.1.0
docker pull mysql:5.7.23
docker save mysql:5.7.23 -o mysql:5.7.23.tar
```

1. 获取 harbor 安装资源:

```bash
helm fetch c7n/harbor --version 1.1.3
```

2. 获取 gitlab 安装资源:

```bash
helm fetch c7n/postgresql --version 3.18.4
helm fetch c7n/gitlab --version 0.5.0
```

## 离线安装 choerodon

1. 配置本地 yum 源服务器

安装 httpd:

```bash
rpm -i \
    apr-1.4.8-5.el7.x86_64.rpm \
    centos-logos-70.0.6-3.el7.centos.noarch.rpm \
    httpd-tools-2.4.6-90.el7.centos.x86_64.rpm \
    apr-util-1.5.2-6.el7.x86_64.rpm \
    httpd-2.4.6-90.el7.centos.x86_64.rpm \
    mailcap-2.1.41-2.el7.noarch.rpm
rpm -i \
    apr-1.4.8-5.el7.x86_64.rpm \
    httpd-tools-2.4.6-90.el7.centos.x86_64.rpm \
    apr-util-1.5.2-6.el7.x86_64.rpm \
    httpd-2.4.6-90.el7.centos.x86_64.rpm \
    mailcap-2.1.41-2.el7.noarch.rpm
```

修改 apache 端口，关闭 selinux, 将软件包放到 `/var/www/html`:

```bash
sed -i "s/^Listen.*/Listen 81/g" /etc/httpd/conf/httpd.conf
setenforce 0
```

安装 createrepo 工具并创建 rpm 包索引并启动 apache:

```bash
rpm -i \
    deltarpm-3.6-3.el7.x86_64.rpm \
    libxml2-python-2.9.1-6.el7_2.3.x86_64.rpm \
    python-deltarpm-3.6-3.el7.x86_64.rpm \
    createrepo-0.9.9-28.el7.noarch.rpm

cd packages
createrepo -pdo $PWD $PWD
mv packages /var/www/html/
systemctl start httpd
```

修改 yum 源:

```bash
cat > /etc/yum.repos.d/base.repo <<EOF
[base]
name=base
baseurl=http://192.168.12.81:81/packages
gpgcheck=0
EOF
```

安装依赖和常用软件

```bash
yum install epel-release git python3-pip sshpass vim
```

```bash
tar -xzvf pip3_package.tar.gz
mv pip3_package/requirements.txt .
pip3 install --no-index --find-links=./pip3_package -r requirements.txt
```

修改 inventory.ini:

```ini
install_mode="offline"
base_yum_repo="http://172.18.103.49:81/packages"
offline_images_src="/root/images/"
offline_images_dest="/root/images/"
```

修改 `roles/prepare/base/task/centos.yml`:

```yml
- name: 添加 epel 仓库
  yum_repository:
    name: epel
    description: EPEL Repository
    baseurl: "{{ epel_yum_repo }}"
    enabled: yes
    gpgcheck: no
    state: present
  when: install_mode == 'online'
```

修改 `roles/prepare/docker/task/centos.yml`:

```yml
- name: 添加 Docker yum 仓库
  yum_repository:
    name: docker-ce
    description: Docker Repository
    baseurl: "{{ docker_yum_repo }}"
    enabled: no
    gpgcheck: no
    state: present
  when: install_mode == "online"

- name: 安装 Docker
  yum:
    name: 
    - "docker-ce-{{ docker_version }}"
    - "docker-ce-cli-{{ docker_version }}"
    - "containerd.io"
    state: present
    enablerepo: base
  when: docker_version is version('18.09', '>=')
```

修改 `roles/prepare/kubernetes/task/centos.yml`:

```yml
- name: 添加 Kubernetes yum 仓库
  yum_repository:
    name: kubernetes
    description: Kubernetes Repository
    baseurl: "{{ kubernetes_yum_repo }}"
    enabled: no
    gpgcheck: no
    state: present
  when: install_mode == "online"
- name: 安装 Docker > 18.09
  yum:
    name: 
    - "docker-ce-{{ docker_version }}"
    - "docker-ce-cli-{{ docker_version }}"
    - "containerd.io"
    state: present
    enablerepo: base
  when: docker_version is version('18.09', '>=')
```

修改 `roles/prepare/docker/tasks/main.yaml`:

```yml
  - name: 加载所需的 Docker 镜像
    shell: for tar in "{{ offline_images_dest }}"/*.tar; do docker load -i $tar; done
  when: install_mode != 'online'
```

1. 安装 kubernetes，等待 k8s 集群安装完成: 

```bash
ansible-playbook -i inventory.ini 90-init-cluster.yml
```
