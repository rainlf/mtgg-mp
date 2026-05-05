# Mango WX

## 项目简介

`mango-wx` 是一个微信小程序版的麻将记分工具，支持用户登录、头像昵称初始化、富豪榜查看、全局对局记录查询、个人对局记录查看，以及牌桌玩家配置和战绩录入。

## 原型设计

https://app.mockplus.cn/p/fKd6Aqzn97

## 小程序截图

![0](https://github.com/user-attachments/assets/2d04fb09-a114-49ee-808f-27c88b37945d)
![1](https://github.com/user-attachments/assets/67e9d55f-df45-40ed-895a-5ea6cf04780b)
![2](https://github.com/user-attachments/assets/16397bc0-3ad8-482e-b6d4-458584db3ac2)
![3](https://github.com/user-attachments/assets/baf92fc2-13e5-4701-b638-a8f15c2338d5)
![5](https://github.com/user-attachments/assets/e6d7716b-153f-45bb-84b5-31112718d8de)
![4](https://github.com/user-attachments/assets/30ae9ac6-70ca-404d-a86e-dee3414959d0)

## Beat Version

![otifK68VfDJ_Vem3OAsfEXymENUQ](https://github.com/user-attachments/assets/1af0ecc3-1093-47c5-b97b-bac760a1bb5c)

## 功能概览

- 微信小程序登录与用户资料初始化
- 头像上传、昵称设置
- 富豪榜展示
- 全局对局记录分页加载
- 指定玩家个人对局记录查询
- 麻将牌桌玩家管理
- 麻将对局结果记录与删除

## 页面结构

当前小程序页面如下：

- `pages/loading/index`：启动加载页
- `pages/login/index`：用户登录与资料初始化
- `pages/majiang/index`：富豪榜、对局记录、个人战绩主页面
- `pages/update/index`：牌桌玩家配置与对局录入页面

## 项目结构

```text
mango-wx
├── miniprogram
│   ├── components        # 业务组件
│   ├── images            # 静态图片资源
│   ├── pages             # 小程序页面
│   ├── services          # 接口请求封装
│   ├── utils             # 数据转换与通用工具
│   ├── app.json          # 小程序全局配置
│   ├── app.ts            # 小程序入口
│   └── app.wxss          # 全局样式
├── typings               # TypeScript 类型声明
├── project.config.json   # 微信开发者工具配置
└── tsconfig.json         # TypeScript 编译配置
```

## 开发说明

### 运行方式

1. 使用微信开发者工具导入项目根目录 `mango-wx`
2. 确保开发者工具开启 TypeScript 编译能力
3. 使用 `project.config.json` 中的 `appid` 进行调试或替换为自己的测试小程序

### 环境配置

接口服务地址在 `miniprogram/services/request-service.ts` 中按小程序环境自动切换：

- `develop` + 开发者工具：`http://localhost:8080`
- `develop` + 真机调试：`https://wx.guanshantech.com`
- `trial`：`https://wx.guanshantech.com`
- `release`：`https://wx.guanshantech.com`

默认情况下，开发者工具中的本地开发环境会请求本机 `8080` 端口后端服务；真机调试和体验版、正式版统一请求线上域名。

### 后端接口依赖

当前小程序依赖以下接口能力：

- `/api/user/login`
- `/api/user/info`
- `/api/user/rank`
- `/api/user/update`
- `/api/game/recent`
- `/api/game/user/list`
- `/api/game/cancel`
- `/api/game/players`
- `/api/game/record`

如果你在本地联调，建议同时启动对应后端服务并确认接口返回格式为：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## 技术栈

- 微信小程序原生框架
- TypeScript
- Skyline Renderer
- Glass-Easel Component Framework

## 说明

`mango-wx` 与 `mgtt-mp` 属于同类麻将记分小程序项目，当前 README 基于 `mgtt-mp` 的简洁说明风格整理，并按 `mango-wx` 现有代码结构与接口配置进行了更新。
