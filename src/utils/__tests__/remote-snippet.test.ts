import test from 'ava'
import sinon from 'sinon'

import * as config from '../../config'
import * as utils from '../remote-snippet'

const sandbox = sinon.createSandbox()

test.beforeEach(() => {
  sandbox.restore()
  sandbox.stub(config, 'getConfig').returns({} as any)
})

test.serial('loadRemoteSnippetList', async (t) => {
  const snippets = [
    {
      url: 'http://example.com/telegram.list',
      name: 'telegram',
    },
    {
      url: 'http://example.com/netflix.list',
      name: 'netflix',
    },
    {
      url: 'http://example.com/test-ruleset.list',
      name: 'test',
    },
    {
      url: 'http://example.com/ForeignMedia.list',
      name: 'ForeignMedia',
    },
    {
      url: 'http://example.com/surgio-snippet.tpl',
      name: 'surgioSnippet',
      surgioSnippet: true,
    },
  ]
  const remoteSnippetList = await utils.loadRemoteSnippetList(snippets)

  // with cache
  await utils.loadRemoteSnippetList(snippets)

  t.snapshot(remoteSnippetList[0].main('Proxy'))
  t.snapshot(remoteSnippetList[1].main('Proxy'))
  t.snapshot(remoteSnippetList[2].main('Proxy'))
  t.snapshot(remoteSnippetList[3].main('Proxy'))
  t.snapshot(remoteSnippetList[4].main('PROXY', 'DIRECT'))

  t.throws(
    () => {
      remoteSnippetList[0].main()
    },
    undefined,
    '必须为片段指定一个策略',
  )

  t.throws(
    () => {
      remoteSnippetList[4].main('PROXY')
    },
    undefined,
    'Surgio 片段参数不足，缺少 rule2',
  )

  t.throws(
    () => {
      // @ts-ignore
      remoteSnippetList[4].main(true, false)
    },
    undefined,
    'Surgio 片段参数 rule1 不为字符串',
  )
})

test.serial('loadRemoteSnippetList in now', async (t) => {
  process.env.NOW_REGION = 'dev_1'

  const remoteSnippetList = await utils.loadRemoteSnippetList([
    {
      url: 'http://example.com/telegram.list?v=1',
      name: 'telegram',
    },
    {
      url: 'http://example.com/netflix.list?v=1',
      name: 'netflix',
    },
    {
      url: 'http://example.com/test-ruleset.list?v=1',
      name: 'test',
    },
    {
      url: 'http://example.com/ForeignMedia.list?v=1',
      name: 'ForeignMedia',
    },
  ])

  t.snapshot(remoteSnippetList[0].main('Proxy'))
  t.snapshot(remoteSnippetList[1].main('Proxy'))
  t.snapshot(remoteSnippetList[2].main('Proxy'))
  t.snapshot(remoteSnippetList[3].main('Proxy'))

  process.env.NOW_REGION = undefined
})

test.serial('loadRemoteSnippetList with error', async (t) => {
  t.plan(1)
  try {
    await utils.loadRemoteSnippetList([
      {
        url: 'http://example.com/error',
        name: 'error',
      },
    ])
  } catch (err) {
    t.truthy(err instanceof Error)
  }
})

test('addProxyToSurgeRuleSet', (t) => {
  t.is(
    utils.addProxyToSurgeRuleSet(
      'AND,((SRC-IP,192.168.1.110), (DOMAIN, example.com))',
      'Proxy',
    ),
    'AND,((SRC-IP,192.168.1.110), (DOMAIN, example.com)),Proxy',
  )
  t.is(
    utils.addProxyToSurgeRuleSet('IP-CIDR,192.168.0.0/16,no-resolve', 'Proxy'),
    'IP-CIDR,192.168.0.0/16,Proxy,no-resolve',
  )
  t.is(
    utils.addProxyToSurgeRuleSet(
      'IP-CIDR6,2a03:2880:f200:c3:face:b00c::177/128,no-resolve',
      'Proxy',
    ),
    'IP-CIDR6,2a03:2880:f200:c3:face:b00c::177/128,Proxy,no-resolve',
  )
  t.is(
    utils.addProxyToSurgeRuleSet('IP-CIDR,192.168.0.0/16', 'Proxy'),
    'IP-CIDR,192.168.0.0/16,Proxy',
  )
  t.is(
    utils.addProxyToSurgeRuleSet(
      'IP-CIDR6,2a03:2880:f200:c3:face:b00c::177/128',
      'Proxy',
    ),
    'IP-CIDR6,2a03:2880:f200:c3:face:b00c::177/128,Proxy',
  )
  t.is(
    utils.addProxyToSurgeRuleSet('GEOIP,US,no-resolve', 'Proxy'),
    'GEOIP,US,Proxy,no-resolve',
  )
  t.is(
    utils.addProxyToSurgeRuleSet('URL-REGEX,^http://google.com', 'Proxy'),
    'URL-REGEX,^http://google.com,Proxy',
  )
  t.is(
    utils.addProxyToSurgeRuleSet(
      'DOMAIN,www.apple.com # comment comment',
      'Proxy',
    ),
    'DOMAIN,www.apple.com,Proxy',
  )
})

test('parseMacro', (t) => {
  t.throws(
    () => {
      utils.parseMacro(`
{% macro wrong_function_name(rule1, rule2) %}
{% endmacro %}
    `)
    },
    undefined,
    '该片段不包含可用的宏',
  )
  t.throws(
    () => {
      utils.parseMacro(`
{% macro main %}
{% endmacro %}
    `)
    },
    undefined,
    '该片段不包含可用的宏',
  )

  t.throws(
    () => {
      utils.parseMacro('')
    },
    undefined,
    '该片段不包含可用的宏',
  )
  t.notThrows(() => {
    utils.parseMacro(`
{% macro main(rule1, rule2) %}
{% endmacro %}
    `)
  })
})
