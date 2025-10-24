import{m as Q,o as q,p as k}from"./index-r6casq6q.js";import{s as F}from"./paths-cq34071r.js";import"./index-qqf7rqfj.js";import C from"node:fs";import p from"node:path";import R from"node:fs";import I from"node:path";var j=null,M=null,$={isIndexing:!1,progress:0,error:void 0};function m(B){let H=[];function U(E,G){let J=R.readdirSync(E,{withFileTypes:!0});for(let N of J){let W=I.join(E,N.name);if(N.isDirectory())U(W,G);else if(N.isFile()&&N.name.endsWith(".md")){let O=I.relative(G,W).replace(/\.md$/,"").replace(/\\/g,"/"),_=R.readFileSync(W,"utf8");H.push({uri:`knowledge://${O}`,content:_})}}}return U(B,B),H}async function y(){let B=F();if(!R.existsSync(B))throw Error(`Knowledge directory not found: ${B}`);console.error("[INFO] Building knowledge search index...");let H=m(B);console.error(`[INFO] Found ${H.length} knowledge files`);let U=q(H);return console.error(`[INFO] Knowledge index built: ${U.totalDocuments} documents, ${U.idf.size} terms`),U}async function v(){if(j)return j;if(M)return M;return $.isIndexing=!0,$.progress=0,$.error=void 0,M=y().then((B)=>{return j=B,$.isIndexing=!1,$.progress=100,B}).catch((B)=>{throw $.isIndexing=!1,$.error=B instanceof Error?B.message:String(B),console.error("[ERROR] Failed to build knowledge index:",B),B}),M}function D(){if($.isIndexing||j)return;console.error("[INFO] Starting background knowledge indexing..."),v().catch((B)=>{console.error("[ERROR] Background knowledge indexing failed:",B)})}function P(){return{isIndexing:$.isIndexing,progress:$.progress,isReady:j!==null,error:$.error}}async function w(B,H={}){let{limit:U=5,minScore:E=0.01,categories:G}=H,J=await v();if(!J)return[];let N=k(B,J.idf),W=J.documents.map((O)=>{let _=0,V=[];for(let[Y,X]of N.entries()){let A=O.terms.get(Y);if(A)_+=X*A,V.push(Y)}let L=0;for(let Y of N.values())L+=Y*Y;L=Math.sqrt(L);let z=L===0||O.magnitude===0?0:_/(L*O.magnitude);return{uri:O.uri,score:z,matchedTerms:V,relevance:Math.round(z*100)}}),Z=W;if(G&&G.length>0)Z=W.filter((O)=>{let _=O.uri.split("/")[1];return G.includes(_)});return Z.filter((O)=>O.score>=E).sort((O,_)=>_.score-O.score).slice(0,U)}async function K(){let B=await v();if(!B)return null;return{loaded:!0,totalDocuments:B.totalDocuments,uniqueTerms:B.idf.size,generatedAt:B.metadata.generatedAt,version:B.metadata.version}}function h(B){let H=/^---\n([\s\S]*?)\n---\n([\s\S]*)$/,U=B.match(H);if(!U)return{metadata:{},content:B};let[,E,G]=U,J={};for(let N of E.split(`
`)){let[W,...Z]=N.split(":");if(W&&Z.length>0)J[W.trim()]=Z.join(":").trim()}return{metadata:J,content:G}}function f(B,H){let U=[],E=C.readdirSync(B,{withFileTypes:!0});for(let G of E){let J=p.join(B,G.name);if(G.isDirectory())U.push(...f(J,H));else if(G.isFile()&&G.name.endsWith(".md")){let N=p.relative(H,J),W=N.replace(/\.md$/,"").replace(/\\/g,"/"),Z=C.readFileSync(J,"utf8"),{metadata:O}=h(Z),_=W.split("/")[0]||"";U.push({relativePath:N,fullPath:J,uri:`knowledge://${W}`,name:O.name||W,description:O.description||"",category:_})}}return U}function x(){let B=F();if(!C.existsSync(B))return[];return f(B,B)}function S(B){let H=B.replace(/^knowledge:\/\//,""),U=F(),E=p.join(U,`${H}.md`);if(!C.existsSync(E))throw Error(`Knowledge resource not found: ${B}`);return C.readFileSync(E,"utf8")}function g(B,H){let E=H.toLowerCase().split(/\s+/),G=0,J=`${B.name} ${B.description} ${B.category} ${B.uri}`.toLowerCase();for(let N of E)if(J.includes(N)){if(B.name.toLowerCase().includes(N))G+=0.5;if(B.description.toLowerCase().includes(N))G+=0.3;if(B.category.toLowerCase().includes(N))G+=0.2}return Math.min(1,G/E.length)}function r(B){let H=x(),U=H.map((E)=>`• ${E.uri}
  ${E.description}`).join(`

`);B.registerTool("search_knowledge",{description:`Search and retrieve domain-specific knowledge and best practices for software development.

**IMPORTANT: Use this tool PROACTIVELY before starting work, not reactively when stuck.**

This tool searches across all knowledge resources and returns the most relevant matches with full content.

When to use this tool (BEFORE starting work):
- **Before research/clarification**: Check relevant stack/universal knowledge to understand domain constraints
- **Before design/architecture**: Review architecture patterns, security, and performance best practices
- **Before implementation**: Consult framework-specific patterns, common pitfalls, and best practices
- **Before testing/QA**: Review testing strategies, coverage requirements, and quality standards
- **Before deployment**: Check deployment patterns, infrastructure, and monitoring guidance

Available knowledge categories:
- **stacks**: Framework-specific patterns (React, Next.js, Node.js)
- **data**: Database patterns (SQL, indexing, migrations)
- **guides**: Architecture guidance (SaaS, tech stack, UI/UX)
- **universal**: Cross-cutting concerns (security, performance, testing, deployment)

The knowledge is curated for LLM code generation - includes decision trees, common bugs, and practical patterns.

**Best Practice**: Check relevant knowledge BEFORE making decisions or writing code, not after encountering issues.`,inputSchema:{query:Q.string().describe('Search query (e.g., "react performance", "security auth", "database indexing")'),limit:Q.number().optional().describe("Maximum number of results to return (default: 5, max: 10)"),categories:Q.array(Q.string()).optional().describe("Filter by categories: stacks, data, guides, universal"),include_content:Q.boolean().optional().describe("Include full content in results (default: true)")}},async(E)=>{let G=E.query,J=Math.min(E.limit||5,10),N=E.categories,W=E.include_content??!0,Z=await w(G,{limit:J,categories:N,minScore:0.01}),O;if(Z.length>0)O=Z.map((Y)=>{return{resource:H.find((A)=>A.uri===Y.uri)||{uri:Y.uri,name:Y.uri,description:"",category:Y.uri.split("/")[1]||""},score:Y.score}});else{let Y=H;if(N&&N.length>0)Y=H.filter((X)=>N.includes(X.category));O=Y.map((X)=>({resource:X,score:g(X,G)})).filter((X)=>X.score>0).sort((X,A)=>A.score-X.score).slice(0,J)}if(O.length===0)return{content:[{type:"text",text:`No knowledge resources found for query: "${G}"

Available categories: stacks, data, guides, universal

Try broader search terms or check available resources with different keywords.`}]};let _=O.map((Y)=>{let{resource:X,score:A}=Y,T=`## ${X.name} (${X.category})
`;if(T+=`**URI**: ${X.uri}
`,T+=`**Relevance**: ${(A*100).toFixed(0)}%
`,T+=`**Description**: ${X.description}

`,W)try{let b=S(X.uri);T+=`---

${b}

`}catch(b){T+=`*Error loading content*

`}return T}),V=await K(),L=Z.length>0?"semantic (TF-IDF)":"fuzzy keyword";return{content:[{type:"text",text:`Found ${O.length} relevant knowledge resource(s) for "${G}" using ${L} search:
${V?`
*Search index: ${V.totalDocuments} docs, ${V.uniqueTerms} terms*
`:""}
`+_.join(`
---

`)}]}}),B.registerTool("get_knowledge",{description:`Get knowledge resource by exact URI.

**NOTE: Prefer using 'search_knowledge' instead - it's easier and doesn't require knowing exact URIs.**

This tool retrieves a specific knowledge resource when you already know its exact URI.

Available URIs:
${U}

For most use cases, use 'search_knowledge' with keywords instead of this tool.`,inputSchema:{uri:Q.string().describe(`Knowledge URI to access (e.g., "knowledge://stacks/react-app"). Available: ${H.map((E)=>E.uri).join(", ")}`)}},(E)=>{let G=E.uri;try{return{content:[{type:"text",text:S(G)}]}}catch(J){return{content:[{type:"text",text:`❌ Error: ${J instanceof Error?J.message:String(J)}

Available knowledge URIs:
${H.map((W)=>`• ${W.uri}`).join(`
`)}`}],isError:!0}}}),B.registerTool("get_knowledge_status",{description:`Get current knowledge indexing status.

Use this to check:
- Whether knowledge indexing is in progress
- If knowledge search is ready
- Any indexing errors

Useful when search_knowledge is slow or returns no results.`,inputSchema:{}},async()=>{let E=P();if(E.isIndexing)return{content:[{type:"text",text:`⏳ **Knowledge Indexing in Progress**

- Progress: ${E.progress}%
- Status: Building search index

*This typically takes <1 second for knowledge base.*`}]};if(E.error)return{content:[{type:"text",text:`❌ **Knowledge Indexing Failed**

Error: ${E.error}`}],isError:!0};if(E.isReady){let G=await K();return{content:[{type:"text",text:`✅ **Knowledge Index Ready**

- Total documents: ${G?.totalDocuments||0}
- Unique terms: ${G?.uniqueTerms||0}
- Status: Ready for search

*You can now use \`search_knowledge\` to search the knowledge base.*`}]}}return{content:[{type:"text",text:`⚠️ **Not Indexed**

Knowledge base has not been indexed yet.

Indexing will start automatically when you first use \`search_knowledge\`.`}]}}),console.error("[INFO] Starting background knowledge indexing..."),D(),console.error("[INFO] Registered knowledge tools: search_knowledge, get_knowledge, get_knowledge_status")}export{r as registerKnowledgeTools,S as getKnowledgeContent,x as getAllKnowledgeResources};
