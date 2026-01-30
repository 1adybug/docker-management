实现一个远程管理 docker 的平台：

主要概念：项目

项目就是 docker-compose.yml 文件

对于项目的管理，就是对 docker-compose.yml 文件的管理

最重要的就是能够实现对 docker-compose.yml 文件的编辑

要有两种编辑方式：

一种是表单类型的编辑，把 docker-compose.yml 文件的配置项转换成表单进行编辑，尽可能变成下拉筛选，单选，复选，日期选择等类型，尽可能让用户操作起来方便，比如镜像就可以读取本地的镜像，然后让用户选择，

另一中是直接进行 yml 格式的编辑

所有与 docker 相关的操作，都使用 `soda-nodejs` 的 `execAsync` 和 `spawnAsync` 进行执行

`execAsync` 主要是能够获取到执行结果，`spawnAsync` 主要是能够获取到执行的输出流

