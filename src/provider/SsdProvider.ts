import assert from 'assert'
import { createLogger } from '@surgio/logger'
import bytes from 'bytes'
import { z } from 'zod'

import {
  NodeTypeEnum,
  ShadowsocksNodeConfig,
  SsdProviderConfig,
  SubscriptionUserinfo,
} from '../types'
import { decodeStringList, fromBase64, SurgioError } from '../utils'
import relayableUrl from '../utils/relayable-url'

import Provider from './Provider'
import { GetNodeListFunction, GetSubscriptionUserInfoFunction } from './types'

const logger = createLogger({
  service: 'surgio:SsdProvider',
})

export default class SsdProvider extends Provider {
  readonly #originalUrl: string
  public readonly udpRelay?: boolean

  constructor(name: string, config: SsdProviderConfig) {
    super(name, config)

    const schema = z.object({
      url: z.string().url(),
      udpRelay: z.boolean().optional(),
    })
    const result = schema.safeParse(config)

    // istanbul ignore next
    if (!result.success) {
      throw new SurgioError('SsdProvider 配置校验失败', {
        cause: result.error,
        providerName: name,
      })
    }

    this.#originalUrl = result.data.url
    this.udpRelay = result.data.udpRelay
    this.supportGetSubscriptionUserInfo = true
  }

  // istanbul ignore next
  public get url(): string {
    return relayableUrl(this.#originalUrl, this.config.relayUrl)
  }

  public getSubscriptionUserInfo: GetSubscriptionUserInfoFunction = async (
    params = {},
  ) => {
    const requestUserAgent = this.determineRequestUserAgent(
      params.requestUserAgent,
    )
    const { subscriptionUserinfo } = await getSsdSubscription(
      this.url,
      this.udpRelay,
      requestUserAgent,
    )

    if (subscriptionUserinfo) {
      return subscriptionUserinfo
    }
    return undefined
  }

  public getNodeList: GetNodeListFunction = async (
    params = {},
  ): Promise<Array<ShadowsocksNodeConfig>> => {
    const requestUserAgent = this.determineRequestUserAgent(
      params.requestUserAgent,
    )
    const { nodeList } = await getSsdSubscription(
      this.url,
      this.udpRelay,
      requestUserAgent,
    )

    if (this.config.hooks?.afterNodeListResponse) {
      const newList = await this.config.hooks.afterNodeListResponse(
        nodeList,
        params,
      )

      if (newList) {
        return newList
      }
    }

    return nodeList
  }
}

// 协议定义：https://github.com/TheCGDF/SSD-Windows/wiki/HTTP%E8%AE%A2%E9%98%85%E5%8D%8F%E5%AE%9A
export const getSsdSubscription = async (
  url: string,
  udpRelay?: boolean,
  requestUserAgent?: string,
): Promise<{
  readonly nodeList: Array<ShadowsocksNodeConfig>
  readonly subscriptionUserinfo?: SubscriptionUserinfo
}> => {
  assert(url, '未指定订阅地址 url')

  const response = await Provider.requestCacheableResource(url, {
    requestUserAgent,
  })

  // istanbul ignore next
  if (!response.body.startsWith('ssd://')) {
    throw new Error(`暂仅支持 ssd:// 开头的订阅地址，${url} 无法处理`)
  }

  const base64 = response.body.replace('ssd://', '')
  const data = JSON.parse(fromBase64(base64)) as SsdSubscription
  const { servers, traffic_used, traffic_total, expiry } = data
  const nodeList: ReadonlyArray<ShadowsocksNodeConfig | undefined> =
    servers.map((server): ShadowsocksNodeConfig | undefined =>
      parseSsdConfig(data, server, udpRelay),
    )

  if (
    !response.subscriptionUserinfo &&
    traffic_used &&
    traffic_total &&
    expiry
  ) {
    response.subscriptionUserinfo = {
      upload: 0,
      download: bytes.parse(`${traffic_used}GB`),
      total: bytes.parse(`${traffic_total}GB`),
      expire: Math.floor(new Date(expiry).getTime() / 1000),
    } as SubscriptionUserinfo
  }

  return {
    nodeList: nodeList.filter(
      (item): item is ShadowsocksNodeConfig => item !== undefined,
    ),
    subscriptionUserinfo: response.subscriptionUserinfo,
  }
}

export const parseSsdConfig = (
  globalConfig: SsdSubscription,
  server: SsdServer,
  udpRelay?: boolean,
): ShadowsocksNodeConfig | undefined => {
  const { airport, port, encryption, password } = globalConfig
  const plugin = server.plugin ?? globalConfig.plugin
  const pluginOptsString = server.plugin_options ?? globalConfig.plugin_options
  const pluginOpts = pluginOptsString
    ? decodeStringList(pluginOptsString.split(';'))
    : {}

  // istanbul ignore next
  if (plugin && !['simple-obfs', 'v2ray-plugin'].includes(plugin)) {
    logger.warn(
      `不支持从 SSD 订阅中读取 ${plugin} 类型的 Shadowsocks 节点，节点 ${server.remarks} 会被省略`,
    )
    return undefined
  }
  // istanbul ignore next
  if (
    plugin === 'v2ray-plugin' &&
    (pluginOpts.mode as string).toLowerCase() === 'quic'
  ) {
    logger.warn(
      `不支持从 SSD 订阅中读取 QUIC 模式的 Shadowsocks 节点，节点 ${server.remarks} 会被省略`,
    )
    return undefined
  }

  return {
    type: NodeTypeEnum.Shadowsocks,
    nodeName:
      server.remarks ?? `${airport} ${server.server}:${server.port ?? port}`,
    hostname: server.server,
    port: server.port ?? port,
    method: server.encryption ?? encryption,
    password: server.password ?? password,
    udpRelay: udpRelay === true,

    // obfs-local
    ...(plugin && plugin === 'simple-obfs'
      ? {
          obfs: pluginOpts.obfs as ShadowsocksNodeConfig['obfs'],
          obfsHost: (pluginOpts['obfs-host'] as string) || 'www.bing.com',
        }
      : null),

    // v2ray-plugin
    ...(plugin && plugin === 'v2ray-plugin'
      ? {
          obfs: (pluginOpts.tls as boolean) ? 'wss' : 'ws',
          obfsHost: pluginOpts.host as string,
        }
      : null),
  }
}

export interface SsdSubscription {
  airport: string
  port: number
  encryption: string
  password: string
  servers: ReadonlyArray<SsdServer>
  plugin?: string
  plugin_options?: string
  traffic_used?: number
  traffic_total?: number
  expiry?: string
}

export interface SsdServer {
  server: string
  port?: number
  encryption?: string
  password?: string
  plugin?: string
  plugin_options?: string
  id?: number
  remarks?: string
  ratio?: number
}
