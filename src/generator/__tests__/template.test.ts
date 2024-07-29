// tslint:disable:no-expression-statement
import { join } from 'path'
import test from 'ava'
import fs from 'fs-extra'

import {
  convertNewSurgeScriptRuleToQuantumultXRewriteRule,
  convertSurgeScriptRuleToQuantumultXRewriteRule,
  getEngine,
  loadLocalSnippet,
} from '../template'

const templateEngine = getEngine(__dirname)
const assetDir = join(__dirname, '../../../test/asset/')

for (const [expression, result] of [
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'PROCESS-NAME,Telegram,Proxy,no-resolve // test rule',
    '- PROCESS-NAME,Telegram,Proxy,no-resolve',
  ],
  ['# Comment', '# Comment'],
  ['URL-REGEX,xxxxxxxxxxxx', ''],
  ['# test', '# test'],
  ['  ', '  '],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
  ],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
  ],
  ['GEOIP,HK,DIRECT,no-resolve', '- GEOIP,HK,DIRECT,no-resolve'],
  ['UID,123,DIRECT', ''],
] as Array<[string, string]>) {
  test(`clash - ${expression} => ${result}`, (t) => {
    t.is(
      templateEngine.renderString('{{ expression | clash }}', {
        expression,
      }),
      result,
    )
  })
}

for (const [expression, result] of [
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'PROCESS-NAME,Telegram,Proxy,no-resolve // test rule',
    '- PROCESS-NAME,Telegram,Proxy,no-resolve',
  ],
  ['# Comment', '# Comment'],
  ['URL-REGEX,xxxxxxxxxxxx', ''],
  ['# test', '# test'],
  ['  ', '  '],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
  ],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
  ],
  ['GEOIP,HK,DIRECT,no-resolve', '- GEOIP,HK,DIRECT,no-resolve'],
  ['FOO,BAR,DIRECT', ''],
] as Array<[string, string]>) {
  test(`clashMeta - ${expression} => ${result}`, (t) => {
    t.is(
      templateEngine.renderString('{{ expression | clashMeta }}', {
        expression,
      }),
      result,
    )
  })
}

for (const [expression, result] of [
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
    '- IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
  ],
  [
    'PROCESS-NAME,Telegram,Proxy,no-resolve // test rule',
    '- PROCESS-NAME,Telegram,Proxy,no-resolve',
  ],
  ['# Comment', '# Comment'],
  ['URL-REGEX,xxxxxxxxxxxx', ''],
  ['# test', '# test'],
  ['  ', '  '],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT',
  ],
  [
    'IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
    '- IP-CIDR6,2011:dab8:3456:82a0::/50,DIRECT,no-resolve',
  ],
  ['GEOIP,HK,DIRECT,no-resolve', '- GEOIP,HK,DIRECT,no-resolve'],
  ['FOO,BAR,DIRECT', ''],
] as Array<[string, string]>) {
  test(`stash - ${expression} => ${result}`, (t) => {
    t.is(
      templateEngine.renderString('{{ expression | stash }}', {
        expression,
      }),
      result,
    )
  })
}

test('base64', (t) => {
  const body = `{{ str | base64 }}`
  const str = `testtesttesttest`

  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, 'dGVzdHRlc3R0ZXN0dGVzdA==')
})

test('quantumultx filter 1', (t) => {
  const body = `{{ str | quantumultx }}`

  t.is(
    templateEngine.renderString(body, {
      str: `PROCESS-NAME,Telegram,Proxy,no-resolve // test rule`,
    }),
    '',
  )
  t.is(
    templateEngine.renderString(body, {
      str: 'IP-CIDR6, 2001:4860:4860::8888/32, DIRECT',
    }),
    'IP6-CIDR, 2001:4860:4860::8888/32, DIRECT',
  )
})

test('quantumultx filter 2', (t) => {
  const body = `{{ str | quantumultx }}`
  const str = fs.readFileSync(join(assetDir, 'surge-script-list.txt'), {
    encoding: 'utf8',
  })
  const result = templateEngine.renderString(body, {
    str,
  })

  t.snapshot(result)
})

test('loon filter 1', (t) => {
  const body = `{{ str | loon }}`
  const str = `# Comment`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, '# Comment')
})

test('loon filter 2', (t) => {
  const body = `{{ str | loon }}`
  const str = [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
    'DOMAIN,example.com,Proxy,force-remote-dns',
  ].join('\n')
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(
    result,
    [
      'IP-CIDR,67.198.55.0/24,Proxy,no-resolve',
      'DOMAIN,example.com,Proxy,force-remote-dns',
    ].join('\n'),
  )
})

test('loon filter 3', (t) => {
  const body = `{{ str | loon }}`
  const str = `IP-CIDR6,xxxxxxxxxxxx`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, '')
})

test('surfboard filter 1', (t) => {
  const body = `{{ str | surfboard }}`
  const str = `# Comment`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, '# Comment')
})

test('surfboard filter 2', (t) => {
  const body = `{{ str | surfboard }}`
  const str = [
    'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
    'DOMAIN,example.com,Proxy,force-remote-dns',
  ].join('\n')
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(
    result,
    [
      'IP-CIDR,67.198.55.0/24,Proxy,no-resolve // test rule',
      'DOMAIN,example.com,Proxy,force-remote-dns',
    ].join('\n'),
  )
})

test('surfboard filter 3', (t) => {
  const body = `{{ str | surfboard }}`
  const str = `IP-CIDR6,xxxxxxxxxxxx`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, 'IP-CIDR6,xxxxxxxxxxxx')
})

test('surfboard filter 4', (t) => {
  const body = `{{ str | surfboard }}`
  const str = `PROCESS-NAME,Telegram,Proxy,no-resolve // test rule`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, 'PROCESS-NAME,Telegram,Proxy,no-resolve // test rule')
})

test('surfboard filter 5', (t) => {
  const body = `{{ str | surfboard }}`
  const str = `RULE-SET,http://example.com/rule-set,DIRECT`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, 'RULE-SET,http://example.com/rule-set,DIRECT')
})

test('surfboard filter 6', (t) => {
  const body = `{{ str | surfboard }}`
  const str = `URL-REGEX,xxxxxxxxxxxx`
  const result = templateEngine.renderString(body, {
    str,
  })

  t.is(result, '')
})

test('spaces in string', (t) => {
  const str = `    `

  t.is(templateEngine.renderString(`{{ str | quantumultx }}`, { str }), '    ')
  t.is(templateEngine.renderString(`{{ str | clash }}`, { str }), '    ')
})

test('ForeignMedia', (t) => {
  const str = fs.readFileSync(join(assetDir, 'ForeignMedia.list'), {
    encoding: 'utf8',
  })

  t.snapshot(
    templateEngine.renderString(`{{ str | quantumultx }}`, {
      str,
    }),
  )
  t.snapshot(
    templateEngine.renderString(`{{ str | clash }}`, {
      str,
    }),
  )
})

test('stringify', (t) => {
  const obj = {
    foo: 'bar',
  }

  t.snapshot(
    templateEngine.renderString(`{{ obj | yaml }}`, {
      obj,
    }),
  )
  t.snapshot(
    templateEngine.renderString(`{{ obj | json }}`, {
      obj,
    }),
  )
})

test('convertSurgeScriptRuleToQuantumultXRewriteRule', (t) => {
  t.is(convertSurgeScriptRuleToQuantumultXRewriteRule(''), '')
  t.is(
    convertSurgeScriptRuleToQuantumultXRewriteRule(
      'unknown-type https://api.zhihu.com/people/ script-path=https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
    ),
    '',
  )
})

test('convertNewSurgeScriptRuleToQuantumultXRewriteRule', (t) => {
  t.is(convertNewSurgeScriptRuleToQuantumultXRewriteRule(''), '')
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'zhihu people = type=http-response,requires-body=1,max-size=0,pattern=https://api.zhihu.com/people/,script-path=https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
    ),
    'https://api.zhihu.com/people/ url script-response-body https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
  )
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'zhihu people = type=http-request,requires-body=1,max-size=0,pattern=https://api.zhihu.com/people/,script-path=https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
    ),
    'https://api.zhihu.com/people/ url script-request-body https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
  )
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'zhihu people = type=http-response,pattern=https://api.zhihu.com/people/,script-path=https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
    ),
    'https://api.zhihu.com/people/ url script-response-header https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
  )
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'zhihu people = type=http-request,pattern=https://api.zhihu.com/people/,script-path=https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
    ),
    'https://api.zhihu.com/people/ url script-request-header https://raw.githubusercontent.com/onewayticket255/Surge-Script/master/surge%20zhihu%20people.js',
  )
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'JD = requires-body=1,max-size=0,script-path= https://raw.githubusercontent.com/NobyDa/Script/master/JD-DailyBonus/JD_DailyBonus.js,type=http-response,pattern=^https?://api.m.jd.com/client.action?functionId=(start|signBean)',
    ),
    '^https?://api.m.jd.com/client.action?functionId=(start|signBean) url script-response-body https://raw.githubusercontent.com/NobyDa/Script/master/JD-DailyBonus/JD_DailyBonus.js',
  )
  t.is(
    convertNewSurgeScriptRuleToQuantumultXRewriteRule(
      'zhihu people = type=unknown-type',
    ),
    '',
  )
})

test('loadLocalSnippet', async (t) => {
  t.snapshot(loadLocalSnippet(__dirname, './snippet.tpl').main('Proxy'))
})
