getSurgeNodes
{{ getSurgeNodes(nodeList) }}
----
getSurfboardNodes
{{ getSurfboardNodes(nodeList) }}
----
getNodeNames
{{ getNodeNames(nodeList) }}
----
getQuantumultXNodes
{{ getQuantumultXNodes(nodeList) }}
----
getSurgeNodes
{{ getSurgeNodes(nodeList, customFilters.globalFilter) }}
----
getLoonNodes
{{ getLoonNodes(nodeList) }}
----
proxyTestUrl
{{ proxyTestUrl }}
----
downloadUrl
{{ downloadUrl }}
---
{{ customParams.globalVariable }}
---
{{ customParams.globalVariableWillBeRewritten }}
---
{{ customParams.subLevel.anotherVariableWillBeRewritten }}
---
{{ snippet("snippet/snippet.tpl").main("Proxy") }}
---
{{ snippet("./snippet/snippet.tpl").main("Proxy") }}
